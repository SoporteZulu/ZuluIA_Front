"use client"

import React, { useEffect, useState } from "react"
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Save,
  X,
  AlertTriangle,
  RefreshCw,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { useItems, useItemsConfig } from "@/lib/hooks/useItems"
import type { Item, CreateItemDto } from "@/lib/types/items"

// --- Empty form ---

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
}

// --- ProductForm ---

interface ProductFormProps {
  item: Item | null
  onClose: () => void
  onSaved: () => void
  createItem: (dto: CreateItemDto) => Promise<boolean>
  updateItem: (id: number, dto: Partial<CreateItemDto>) => Promise<boolean>
}

function ProductForm({ item, onClose, onSaved, createItem, updateItem }: ProductFormProps) {
  const { categorias, unidades, alicuotas, monedas } = useItemsConfig()
  const [form, setForm] = useState<CreateItemDto>(
    item
      ? {
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
      : { ...EMPTY_FORM }
  )
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const set = (k: keyof CreateItemDto, v: unknown) => setForm((prev) => ({ ...prev, [k]: v }))

  const validate = (): string | null => {
    if (!form.codigo.trim()) return "El código es requerido"
    if (!form.descripcion.trim()) return "La descripción es requerida"
    return null
  }

  const handleSave = async () => {
    const err = validate()
    if (err) {
      setFormError(err)
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
    <div className="space-y-4">
      <Tabs defaultValue="basicos" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basicos">Datos Basicos</TabsTrigger>
          <TabsTrigger value="precios">Precios</TabsTrigger>
          <TabsTrigger value="inventario">Inventario</TabsTrigger>
        </TabsList>

        <TabsContent value="basicos" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Codigo (SKU) <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="PROD-001"
                value={form.codigo}
                onChange={(e) => set("codigo", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>
                Descripcion <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Nombre del producto"
                value={form.descripcion}
                onChange={(e) => set("descripcion", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={form.categoriaId ? String(form.categoriaId) : "__none__"}
                onValueChange={(v) => set("categoriaId", v !== "__none__" ? Number(v) : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin categoria</SelectItem>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unidad de Medida</Label>
              <Select
                value={form.unidadMedidaId ? String(form.unidadMedidaId) : ""}
                onValueChange={(v) => set("unidadMedidaId", v ? Number(v) : 0)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar unidad" />
                </SelectTrigger>
                <SelectContent>
                  {unidades.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.descripcion} ({u.codigo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Alicuota IVA</Label>
              <Select
                value={form.alicuotaIvaId ? String(form.alicuotaIvaId) : ""}
                onValueChange={(v) => set("alicuotaIvaId", v ? Number(v) : 0)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar IVA" />
                </SelectTrigger>
                <SelectContent>
                  {alicuotas.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.descripcion} ({a.porcentaje}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Moneda</Label>
              <Select
                value={form.monedaId ? String(form.monedaId) : ""}
                onValueChange={(v) => set("monedaId", v ? Number(v) : 0)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar moneda" />
                </SelectTrigger>
                <SelectContent>
                  {monedas.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.descripcion} ({m.simbolo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Codigo de Barras</Label>
              <Input
                placeholder="7790000000000"
                value={form.codigoBarras ?? ""}
                onChange={(e) => set("codigoBarras", e.target.value || null)}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Descripcion Adicional</Label>
              <Textarea
                placeholder="Descripcion detallada del producto"
                value={form.descripcionAdicional ?? ""}
                onChange={(e) => set("descripcionAdicional", e.target.value || null)}
                rows={3}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-6 pt-2">
            <div className="flex items-center gap-2">
              <Switch
                id="esProducto"
                checked={form.esProducto}
                onCheckedChange={(v) => set("esProducto", v)}
              />
              <Label htmlFor="esProducto">Es Producto</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="esServicio"
                checked={form.esServicio}
                onCheckedChange={(v) => set("esServicio", v)}
              />
              <Label htmlFor="esServicio">Es Servicio</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="manejaStock"
                checked={form.manejaStock}
                onCheckedChange={(v) => set("manejaStock", v)}
              />
              <Label htmlFor="manejaStock">Maneja Stock</Label>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="precios" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Precio Costo</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={form.precioCosto}
                onChange={(e) => set("precioCosto", parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Precio de Venta</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={form.precioVenta}
                onChange={(e) => set("precioVenta", parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
          {form.precioCosto > 0 && form.precioVenta > 0 && (
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground block mb-1">Margen</span>
                    <p className="text-lg font-bold text-orange-600">
                      {(((form.precioVenta - form.precioCosto) / form.precioVenta) * 100).toFixed(
                        1
                      )}
                      %
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Ganancia Unitaria</span>
                    <p className="text-lg font-bold text-green-600">
                      {form.precioVenta != null && form.precioCosto != null
                        ? (form.precioVenta - form.precioCosto).toLocaleString("es-AR", {
                            minimumFractionDigits: 2,
                          })
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Markup</span>
                    <p className="text-lg font-bold">
                      {((form.precioVenta / form.precioCosto - 1) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="inventario" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Stock Minimo</Label>
              <Input
                type="number"
                placeholder="0"
                value={form.stockMinimo}
                onChange={(e) => set("stockMinimo", parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Stock Maximo</Label>
              <Input
                type="number"
                placeholder="Sin limite"
                value={form.stockMaximo ?? ""}
                onChange={(e) =>
                  set("stockMaximo", e.target.value ? parseInt(e.target.value) : null)
                }
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {formError && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="h-4 w-4" /> {formError}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button variant="outline" onClick={onClose} className="bg-transparent">
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Guardando..." : item ? "Guardar Cambios" : "Crear Producto"}
        </Button>
      </div>
    </div>
  )
}

// --- Detail Dialog ---

function ProductDetail({
  item,
  onClose,
  onEdit,
}: {
  item: Item
  onClose: () => void
  onEdit: () => void
}) {
  const stock = item.stock ?? 0
  const margen =
    item.precioVenta > 0 && item.precioCosto > 0
      ? (((item.precioVenta - item.precioCosto) / item.precioVenta) * 100).toFixed(1)
      : "0"

  return (
    <Tabs defaultValue="general" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="precios">Precios y Costos</TabsTrigger>
        <TabsTrigger value="inventario">Inventario</TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Informacion General</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground block mb-1">Nombre</span>
                <p className="font-medium">{item.descripcion}</p>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">SKU</span>
                <p className="font-mono font-medium">{item.codigo}</p>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Categoria</span>
                <p className="font-medium">{item.categoriaDescripcion || "-"}</p>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Unidad de Medida</span>
                <p className="font-medium uppercase">{item.unidadMedidaDescripcion || "-"}</p>
              </div>
              {item.codigoBarras && (
                <div>
                  <span className="text-muted-foreground block mb-1">Codigo de Barras</span>
                  <p className="font-mono font-medium">{item.codigoBarras}</p>
                </div>
              )}
              <div className="flex gap-2 flex-wrap col-span-2">
                {item.esProducto && <Badge variant="outline">Producto</Badge>}
                {item.esServicio && <Badge variant="outline">Servicio</Badge>}
                {item.manejaStock && <Badge variant="outline">Maneja Stock</Badge>}
                <Badge
                  variant="secondary"
                  className={
                    item.activo ? "bg-green-500/10 text-green-600" : "bg-gray-500/10 text-gray-500"
                  }
                >
                  {item.activo ? "Activo" : "Inactivo"}
                </Badge>
              </div>
              {item.descripcionAdicional && (
                <div className="col-span-2">
                  <span className="text-muted-foreground block mb-1">Descripcion</span>
                  <p className="text-sm">{item.descripcionAdicional}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="precios" className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground">Costo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">
                {item.precioCosto != null
                  ? item.precioCosto.toLocaleString("es-AR", { minimumFractionDigits: 2 })
                  : "-"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground">Precio de Venta</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-purple-600">
                {item.precioVenta != null
                  ? item.precioVenta.toLocaleString("es-AR", { minimumFractionDigits: 2 })
                  : "-"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground">Margen</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-orange-600">{margen}%</p>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Analisis de Rentabilidad</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Ganancia Unitaria:</span>
                <span className="font-semibold">
                  {item.precioVenta != null && item.precioCosto != null
                    ? (item.precioVenta - item.precioCosto).toLocaleString("es-AR", {
                        minimumFractionDigits: 2,
                      })
                    : "-"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Valor Stock al Costo:</span>
                <span className="font-semibold">
                  {item.precioCosto != null && stock != null
                    ? (item.precioCosto * stock).toLocaleString("es-AR", {
                        minimumFractionDigits: 2,
                      })
                    : "-"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Valor Stock al Precio:</span>
                <span className="font-semibold text-green-600">
                  {item.precioVenta != null && stock != null
                    ? (item.precioVenta * stock).toLocaleString("es-AR", {
                        minimumFractionDigits: 2,
                      })
                    : "-"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="inventario" className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Stock Actual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-bold text-green-600">{stock}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {item.unidadMedidaDescripcion || "unidades"}
                </p>
              </div>
              {item.manejaStock && stock <= item.stockMinimo && (
                <Alert className="w-50">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Stock por debajo del minimo
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              Stock minimo: {item.stockMinimo}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <DialogFooter className="gap-2 mt-4">
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
        <Button onClick={onEdit}>
          <Edit className="h-4 w-4 mr-2" />
          Editar
        </Button>
      </DialogFooter>
    </Tabs>
  )
}

// --- Main Page ---

const ProductosPage = () => {
  const {
    items,
    loading,
    error,
    totalCount,
    page,
    setPage,
    totalPages,
    search,
    setSearch,
    createItem,
    updateItem,
    deleteItem,
    refetch,
  } = useItems()

  const [searchTerm, setSearchTerm] = useState("")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [detailItem, setDetailItem] = useState<Item | null>(null)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleSearchChange = (val: string) => {
    setSearchTerm(val)
    setSearch(val)
  }

  const handleViewDetail = (item: Item) => {
    setDetailItem(item)
    setIsDetailOpen(true)
  }

  const handleEdit = (item: Item) => {
    setEditingItem(item)
    setIsFormOpen(true)
  }

  const handleDelete = (item: Item) => {
    setItemToDelete(item)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!itemToDelete) return
    setDeleting(true)
    const ok = await deleteItem(itemToDelete.id)
    setDeleting(false)

    if (!ok) return

    setIsDeleteDialogOpen(false)
    setItemToDelete(null)
    refetch()
  }

  const handleSaved = () => {
    setIsFormOpen(false)
    setEditingItem(null)
    refetch()
  }

  useEffect(() => {
    if (detailItem) {
      const nextDetail = items.find((item) => item.id === detailItem.id)

      if (!nextDetail) {
        setDetailItem(null)
        setIsDetailOpen(false)
      } else if (nextDetail !== detailItem) {
        setDetailItem(nextDetail)
      }
    }

    if (editingItem) {
      const nextEditing = items.find((item) => item.id === editingItem.id)

      if (!nextEditing) {
        setEditingItem(null)
        setIsFormOpen(false)
      } else if (nextEditing !== editingItem) {
        setEditingItem(nextEditing)
      }
    }

    if (itemToDelete) {
      const nextDeleteTarget = items.find((item) => item.id === itemToDelete.id)

      if (!nextDeleteTarget) {
        setItemToDelete(null)
        setIsDeleteDialogOpen(false)
      } else if (nextDeleteTarget !== itemToDelete) {
        setItemToDelete(nextDeleteTarget)
      }
    }
  }, [detailItem, editingItem, itemToDelete, items])

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5065"

  const catalogSummary = React.useMemo(() => {
    const stockBajo = items.filter(
      (item) => item.manejaStock && (item.stock ?? 0) <= item.stockMinimo
    )
    const margenPromedio =
      items.length > 0
        ? items.reduce(
            (sum, item) =>
              sum +
              (item.precioVenta > 0
                ? ((item.precioVenta - item.precioCosto) / item.precioVenta) * 100
                : 0),
            0
          ) / items.length
        : 0

    return {
      stockBajo,
      valorStock: items.reduce((sum, item) => sum + item.precioCosto * (item.stock ?? 0), 0),
      margenPromedio,
      activos: items.filter((item) => item.activo).length,
      servicios: items.filter((item) => item.esServicio).length,
      sinCategoria: items.filter((item) => !item.categoriaDescripcion).length,
      margenBajo: items.filter(
        (item) =>
          item.precioVenta > 0 &&
          ((item.precioVenta - item.precioCosto) / item.precioVenta) * 100 < 20
      ).length,
    }
  }, [items])

  const categoryCoverage = React.useMemo(() => {
    const groups = new Map<
      string,
      { cantidad: number; valorStock: number; margenPromedio: number }
    >()

    items.forEach((item) => {
      const key = item.categoriaDescripcion || "Sin categoria"
      const current = groups.get(key) ?? { cantidad: 0, valorStock: 0, margenPromedio: 0 }
      const margen =
        item.precioVenta > 0 ? ((item.precioVenta - item.precioCosto) / item.precioVenta) * 100 : 0
      current.cantidad += 1
      current.valorStock += item.precioCosto * (item.stock ?? 0)
      current.margenPromedio += margen
      groups.set(key, current)
    })

    return Array.from(groups.entries())
      .map(([categoria, values]) => ({
        categoria,
        cantidad: values.cantidad,
        valorStock: values.valorStock,
        margenPromedio: values.margenPromedio / Math.max(values.cantidad, 1),
      }))
      .sort((left, right) => right.cantidad - left.cantidad)
      .slice(0, 6)
  }, [items])

  const catalogAlerts = React.useMemo(() => {
    return items
      .map((item) => {
        const margen =
          item.precioVenta > 0
            ? ((item.precioVenta - item.precioCosto) / item.precioVenta) * 100
            : 0
        const stock = item.stock ?? 0
        let motivo: string | null = null

        if (item.manejaStock && stock <= item.stockMinimo && margen < 20) {
          motivo = "Stock bajo y margen corto"
        } else if (item.manejaStock && stock <= item.stockMinimo) {
          motivo = "Stock por debajo del minimo"
        } else if (margen < 20) {
          motivo = "Margen por debajo del umbral"
        }

        if (!motivo) return null

        return {
          id: item.id,
          codigo: item.codigo,
          descripcion: item.descripcion,
          motivo,
          margen,
          stock,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .slice(0, 8)
  }, [items])

  return (
    <div className="space-y-6 pb-6">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Productos</h1>
          <p className="text-muted-foreground">Catalogo de productos y gestion de precios</p>
        </div>
        <Button
          onClick={() => {
            setEditingItem(null)
            setIsFormOpen(true)
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Producto
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Productos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {catalogSummary.activos} activos en catalogo
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stock Bajo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {catalogSummary.stockBajo.length}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Items en tension de reposicion</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor Total Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${catalogSummary.valorStock.toLocaleString("es-AR")}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Valuado al costo visible</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Margen Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{catalogSummary.margenPromedio.toFixed(1)}%</div>
            <p className="mt-1 text-xs text-muted-foreground">Sobre todos los items visibles</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Servicios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{catalogSummary.servicios}</div>
            <p className="mt-1 text-xs text-muted-foreground">Items no stockeables o mixtos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Margen Bajo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{catalogSummary.margenBajo}</div>
            <p className="mt-1 text-xs text-muted-foreground">Items por debajo del 20%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Cobertura por Categoria</CardTitle>
            <CardDescription>Lectura comercial del catalogo visible</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Valor Stock</TableHead>
                  <TableHead className="text-right">Margen Prom.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryCoverage.map((category) => (
                  <TableRow key={category.categoria}>
                    <TableCell className="font-medium">{category.categoria}</TableCell>
                    <TableCell className="text-right">{category.cantidad}</TableCell>
                    <TableCell className="text-right">
                      ${category.valorStock.toLocaleString("es-AR")}
                    </TableCell>
                    <TableCell className="text-right">
                      {category.margenPromedio.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Señales de Catalogo</CardTitle>
            <CardDescription>Productos que piden revision comercial o de stock</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {catalogAlerts.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No hay alertas relevantes en el set visible.
                </p>
              )}
              {catalogAlerts.map((alertItem) => (
                <div key={alertItem.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{alertItem.descripcion}</p>
                      <p className="text-xs text-muted-foreground font-mono">{alertItem.codigo}</p>
                    </div>
                    <Badge variant="outline">{alertItem.motivo}</Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Margen {alertItem.margen.toFixed(1)}%</span>
                    <span>Stock {alertItem.stock}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por SKU o nombre..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          {!loading && !error && (
            <p className="text-xs text-muted-foreground mt-2">{totalCount} productos encontrados</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-0">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Cargando productos...</span>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center gap-3 py-12">
              <div className="flex items-center gap-2 text-red-500">
                <AlertCircle className="h-5 w-5" />
                <p className="text-sm font-medium">
                  {error.includes("fetch") || error.includes("network") || error.includes("Failed")
                    ? "No se pudo conectar con el servidor. Verifica que el backend este corriendo en " +
                      apiUrl +
                      "."
                    : error}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={refetch}>
                <RefreshCw className="h-4 w-4 mr-2" /> Reintentar
              </Button>
            </div>
          )}

          {!loading && !error && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Costo</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Margen</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No se encontraron productos
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => {
                      const stock = item.stock ?? 0
                      const bajStock = item.manejaStock && stock <= item.stockMinimo
                      const margen =
                        item.precioVenta > 0 && item.precioCosto > 0
                          ? (
                              ((item.precioVenta - item.precioCosto) / item.precioVenta) *
                              100
                            ).toFixed(1)
                          : "-"
                      return (
                        <TableRow
                          key={item.id}
                          onClick={() => handleViewDetail(item)}
                          className="cursor-pointer hover:bg-muted/50"
                        >
                          <TableCell className="font-mono text-sm">{item.codigo}</TableCell>
                          <TableCell className="font-medium">{item.descripcion}</TableCell>
                          <TableCell>{item.categoriaDescripcion || "-"}</TableCell>
                          <TableCell className="text-right">
                            {item.manejaStock ? (
                              <Badge variant={bajStock ? "destructive" : "outline"}>
                                {stock} {item.unidadMedidaDescripcion || ""}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">N/A</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.precioCosto != null
                              ? item.precioCosto.toLocaleString("es-AR")
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {item.precioVenta != null
                              ? item.precioVenta.toLocaleString("es-AR")
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {margen !== "-" ? margen + "%" : "-"}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewDetail(item)}
                                title="Ver detalle"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(item)}
                                title="Editar"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(item)}
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

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Pagina {page} de {totalPages}
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
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {detailItem?.descripcion}
              {detailItem && (
                <Badge
                  variant="secondary"
                  className={
                    detailItem.activo
                      ? "bg-green-500/10 text-green-600"
                      : "bg-gray-500/10 text-gray-500"
                  }
                >
                  {detailItem.activo ? "Activo" : "Inactivo"}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>SKU: {detailItem?.codigo}</DialogDescription>
          </DialogHeader>
          {detailItem && (
            <ProductDetail
              item={detailItem}
              onClose={() => setIsDetailOpen(false)}
              onEdit={() => {
                setIsDetailOpen(false)
                handleEdit(detailItem)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Form Dialog */}
      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsFormOpen(false)
            setEditingItem(null)
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Editando " + editingItem.descripcion
                : "Completa los datos para crear un nuevo producto"}
            </DialogDescription>
          </DialogHeader>
          <ProductForm
            key={`${editingItem?.id ?? "new-product"}-${isFormOpen ? "open" : "closed"}`}
            item={editingItem}
            onClose={() => {
              setIsFormOpen(false)
              setEditingItem(null)
            }}
            onSaved={handleSaved}
            createItem={createItem}
            updateItem={updateItem}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar Eliminacion
            </DialogTitle>
            <DialogDescription>
              Esta accion no se puede deshacer. El producto sera eliminado permanentemente.
            </DialogDescription>
          </DialogHeader>
          {itemToDelete && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SKU:</span>
                    <span className="font-mono font-medium">{itemToDelete.codigo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nombre:</span>
                    <span className="font-medium">{itemToDelete.descripcion}</span>
                  </div>
                  {itemToDelete.manejaStock && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Stock:</span>
                      <span className="font-medium">
                        {itemToDelete.stock ?? 0} {itemToDelete.unidadMedidaDescripcion || ""}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setItemToDelete(null)
              }}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              <Trash2 className="h-4 w-4 mr-2" />
              {deleting ? "Eliminando..." : "Eliminar Producto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ProductosPage
