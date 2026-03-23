"use client"

import { useMemo, useState } from "react"
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Tag,
  CalendarDays,
  AlertCircle,
  Percent,
  Star,
  Package,
  Save,
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
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useListasPrecios } from "@/lib/hooks/useListasPrecios"
import { useItems, useItemsConfig } from "@/lib/hooks/useItems"
import type {
  CreateListaPreciosDto,
  ListaPrecios,
  ListaPreciosDetalle,
  UpsertItemEnListaDto,
} from "@/lib/types/listas-precios"

function formatMoney(value: number) {
  return value.toLocaleString("es-AR", { style: "currency", currency: "ARS" })
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "-"
}

function isCurrentList(list: ListaPrecios) {
  const today = new Date().toISOString().slice(0, 10)
  const startsOk = !list.vigenciaDesde || list.vigenciaDesde <= today
  const endsOk = !list.vigenciaHasta || list.vigenciaHasta >= today
  return list.activa && startsOk && endsOk
}

function getValidityStatus(list: Pick<ListaPrecios, "activa" | "vigenciaDesde" | "vigenciaHasta">) {
  const today = new Date().toISOString().slice(0, 10)
  if (!list.activa) return "Lista inactiva"
  if (list.vigenciaDesde && list.vigenciaDesde > today) {
    return `Disponible desde ${formatDate(list.vigenciaDesde)}`
  }
  if (list.vigenciaHasta && list.vigenciaHasta < today) {
    return `Vencida el ${formatDate(list.vigenciaHasta)}`
  }
  if (list.vigenciaHasta) return `Operativa hasta ${formatDate(list.vigenciaHasta)}`
  return "Operativa sin fecha de cierre"
}

function getCommercialPriority(
  list: Pick<ListaPrecios, "activa" | "esDefault" | "vigenciaDesde" | "vigenciaHasta">
) {
  if (!list.activa) return "Fuera del circuito comercial"
  if (isCurrentList(list) && list.esDefault) return "Lista prioritaria para operación inmediata"
  if (isCurrentList(list)) return "Lista disponible para cotización y venta"
  if (list.vigenciaDesde)
    return `Reservada para próxima vigencia desde ${formatDate(list.vigenciaDesde)}`
  return "Lista activa de referencia"
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

interface PriceListFormProps {
  list: ListaPreciosDetalle | null
  onClose: () => void
  onSaved: () => void
  saveList: (id: number | null, payload: CreateListaPreciosDto) => Promise<boolean>
  monedas: Array<{ id: number; descripcion: string; simbolo: string }>
}

function createPriceListFormState(
  list: ListaPreciosDetalle | null,
  monedas: Array<{ id: number; descripcion: string; simbolo: string }>
): CreateListaPreciosDto {
  if (list) {
    return {
      nombre: list.nombre,
      monedaId: list.monedaId,
      vigenciaDesde: list.vigenciaDesde,
      vigenciaHasta: list.vigenciaHasta,
      esDefault: list.esDefault,
    }
  }

  return {
    nombre: "",
    monedaId: monedas[0]?.id ?? 0,
    vigenciaDesde: null,
    vigenciaHasta: null,
    esDefault: false,
  }
}

function PriceListForm({ list, onClose, onSaved, saveList, monedas }: PriceListFormProps) {
  const [tab, setTab] = useState("principal")
  const [form, setForm] = useState<CreateListaPreciosDto>(() =>
    createPriceListFormState(list, monedas)
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (key: keyof CreateListaPreciosDto, value: string | number | boolean | null) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    if (!form.nombre.trim() || !form.monedaId) {
      setError("Nombre y moneda son obligatorios")
      return
    }

    setSaving(true)
    setError(null)
    const ok = await saveList(list?.id ?? null, form)
    setSaving(false)

    if (ok) onSaved()
    else setError("No se pudo guardar la lista de precios")
  }

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid h-auto w-full grid-cols-3">
          <TabsTrigger value="principal" className="py-2 text-xs">
            Principal
          </TabsTrigger>
          <TabsTrigger value="vigencia" className="py-2 text-xs">
            Vigencia
          </TabsTrigger>
          <TabsTrigger value="legado" className="py-2 text-xs">
            Legado
          </TabsTrigger>
        </TabsList>

        <TabsContent value="principal" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label>Nombre</Label>
              <Input value={form.nombre} onChange={(event) => set("nombre", event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Moneda</Label>
              <Select
                value={form.monedaId ? String(form.monedaId) : ""}
                onValueChange={(value) => set("monedaId", Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar moneda" />
                </SelectTrigger>
                <SelectContent>
                  {monedas.map((moneda) => (
                    <SelectItem key={moneda.id} value={String(moneda.id)}>
                      {moneda.descripcion} ({moneda.simbolo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
              <Switch
                id="lista-default"
                checked={Boolean(form.esDefault)}
                onCheckedChange={(checked) => set("esDefault", checked)}
              />
              <Label htmlFor="lista-default">Marcar como lista predeterminada</Label>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="vigencia" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Desde</Label>
              <Input
                type="date"
                value={form.vigenciaDesde ?? ""}
                onChange={(event) => set("vigenciaDesde", event.target.value || null)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Hasta</Label>
              <Input
                type="date"
                value={form.vigenciaHasta ?? ""}
                onChange={(event) => set("vigenciaHasta", event.target.value || null)}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="legado" className="mt-4 space-y-4">
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              El legado contemplaba promociones encadenadas, herencia entre listas, precios
              especiales por cliente y campañas por período. Esta base deja el maestro real listo
              para esa siguiente fase sin simular reglas inexistentes en la API.
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
          {saving ? "Guardando..." : list ? "Guardar cambios" : "Crear lista"}
        </Button>
      </div>
    </div>
  )
}

interface PriceListItemsManagerProps {
  list: ListaPreciosDetalle
  onChanged: (detail: ListaPreciosDetalle) => void
  upsert: (listaId: number, payload: UpsertItemEnListaDto) => Promise<boolean>
  remove: (listaId: number, itemId: number) => Promise<boolean>
}

function createPriceListItemDrafts(items: ListaPreciosDetalle["items"]) {
  return Object.fromEntries(
    items.map((item) => [item.itemId, { precio: item.precio, descuentoPct: item.descuentoPct }])
  )
}

function PriceListItemsManager({ list, onChanged, upsert, remove }: PriceListItemsManagerProps) {
  const { items } = useItems()
  const [selectedItemId, setSelectedItemId] = useState("__none__")
  const [newPrice, setNewPrice] = useState(0)
  const [newDiscount, setNewDiscount] = useState(0)
  const [drafts, setDrafts] = useState<Record<number, { precio: number; descuentoPct: number }>>(
    () => createPriceListItemDrafts(list.items)
  )
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async () => {
    if (selectedItemId === "__none__" || newPrice <= 0) {
      setError("Seleccione un producto y defina un precio mayor a cero")
      return
    }

    const itemId = Number(selectedItemId)
    const ok = await upsert(list.id, {
      itemId,
      precio: newPrice,
      descuentoPct: newDiscount,
    })

    if (!ok) {
      setError("No se pudo agregar el producto a la lista")
      return
    }

    const catalogItem = items.find((item) => item.id === itemId)
    const nextItems = list.items.some((item) => item.itemId === itemId)
      ? list.items.map((item) =>
          item.itemId === itemId ? { ...item, precio: newPrice, descuentoPct: newDiscount } : item
        )
      : [
          ...list.items,
          {
            itemId,
            itemDescripcion: catalogItem?.descripcion ?? `#${itemId}`,
            itemCodigo: catalogItem?.codigo ?? `#${itemId}`,
            precio: newPrice,
            descuentoPct: newDiscount,
          },
        ]

    onChanged({ ...list, items: nextItems })
    setSelectedItemId("__none__")
    setNewPrice(0)
    setNewDiscount(0)
    setError(null)
  }

  const handleSaveRow = async (itemId: number) => {
    const draft = drafts[itemId]
    if (!draft || draft.precio <= 0) return

    const ok = await upsert(list.id, {
      itemId,
      precio: draft.precio,
      descuentoPct: draft.descuentoPct,
    })
    if (!ok) return

    onChanged({
      ...list,
      items: list.items.map((item) => (item.itemId === itemId ? { ...item, ...draft } : item)),
    })
  }

  const handleRemove = async (itemId: number) => {
    const ok = await remove(list.id, itemId)
    if (!ok) return
    onChanged({ ...list, items: list.items.filter((item) => item.itemId !== itemId) })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agregar o actualizar ítem</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-[1fr_180px_160px_auto]">
            <Select value={selectedItemId} onValueChange={setSelectedItemId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar producto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Seleccionar producto</SelectItem>
                {items.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {item.codigo} · {item.descripcion}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={0}
              step={0.01}
              placeholder="Precio"
              value={newPrice || ""}
              onChange={(event) => setNewPrice(parseFloat(event.target.value) || 0)}
            />
            <Input
              type="number"
              min={0}
              max={100}
              step={0.01}
              placeholder="Desc. %"
              value={newDiscount || ""}
              onChange={(event) => setNewDiscount(parseFloat(event.target.value) || 0)}
            />
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Guardar ítem
            </Button>
          </div>
          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead className="text-right">Precio</TableHead>
            <TableHead className="text-right">Descuento</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                Esta lista todavía no tiene productos asociados.
              </TableCell>
            </TableRow>
          ) : (
            list.items.map((item) => {
              const draft = drafts[item.itemId] ?? {
                precio: item.precio,
                descuentoPct: item.descuentoPct,
              }
              return (
                <TableRow key={item.itemId}>
                  <TableCell>
                    <p className="font-medium">{item.itemDescripcion}</p>
                    <p className="text-xs text-muted-foreground font-mono">{item.itemCodigo}</p>
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      className="ml-auto w-32 text-right"
                      type="number"
                      min={0}
                      step={0.01}
                      value={draft.precio}
                      onChange={(event) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [item.itemId]: {
                            ...draft,
                            precio: parseFloat(event.target.value) || 0,
                          },
                        }))
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      className="ml-auto w-28 text-right"
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={draft.descuentoPct}
                      onChange={(event) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [item.itemId]: {
                            ...draft,
                            descuentoPct: parseFloat(event.target.value) || 0,
                          },
                        }))
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSaveRow(item.itemId)}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleRemove(item.itemId)}>
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
  )
}

function PriceListDetail({
  list,
  onChanged,
  upsert,
  remove,
}: {
  list: ListaPreciosDetalle
  onChanged: (detail: ListaPreciosDetalle) => void
  upsert: (listaId: number, payload: UpsertItemEnListaDto) => Promise<boolean>
  remove: (listaId: number, itemId: number) => Promise<boolean>
}) {
  const avgDiscount =
    list.items.length > 0
      ? list.items.reduce((acc, item) => acc + item.descuentoPct, 0) / list.items.length
      : 0
  const highestPrice =
    list.items.length > 0 ? Math.max(...list.items.map((item) => item.precio)) : 0

  const principalFields = [
    { label: "Nombre", value: list.nombre },
    { label: "Moneda", value: list.monedaSimbolo ?? `#${list.monedaId}` },
    { label: "Lista vigente hoy", value: isCurrentList(list) ? "Sí" : "No" },
    { label: "Predeterminada", value: list.esDefault ? "Sí" : "No" },
    { label: "Vigencia desde", value: formatDate(list.vigenciaDesde) },
    { label: "Vigencia hasta", value: formatDate(list.vigenciaHasta) },
    { label: "Estado", value: list.activa ? "Activa" : "Inactiva" },
    { label: "Creada", value: formatDate(list.createdAt) },
  ]

  const operationalFields = [
    { label: "Estado de vigencia", value: getValidityStatus(list) },
    { label: "Cobertura actual", value: `${list.items.length} productos asociados` },
    { label: "Descuento promedio", value: `${avgDiscount.toFixed(2)}%` },
    {
      label: "Precio más alto",
      value: highestPrice > 0 ? formatMoney(highestPrice) : "Sin precios cargados",
    },
    { label: "Lista predeterminada", value: list.esDefault ? "Sí, prioritaria" : "No" },
    {
      label: "Uso comercial",
      value: isCurrentList(list)
        ? "Disponible para operación inmediata"
        : "Disponible como referencia o próxima vigencia",
    },
  ]

  return (
    <Tabs defaultValue="principal" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="principal">Principal</TabsTrigger>
        <TabsTrigger value="circuito">Circuito</TabsTrigger>
        <TabsTrigger value="items">Items</TabsTrigger>
        <TabsTrigger value="legado">Legado</TabsTrigger>
      </TabsList>

      <TabsContent value="principal" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Tag className="h-4 w-4" /> Cabecera comercial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={principalFields} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="circuito" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4" /> Estado operativo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={operationalFields} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="items" className="space-y-4">
        <PriceListItemsManager
          key={`${list.id}-${list.items.map((item) => `${item.itemId}:${item.precio}:${item.descuentoPct}`).join("|")}`}
          list={list}
          onChanged={onChanged}
          upsert={upsert}
          remove={remove}
        />
      </TabsContent>

      <TabsContent value="legado" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bloques reservados</CardTitle>
            <CardDescription>
              Promociones, herencias, precios especiales y reglas comerciales avanzadas.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 text-sm text-muted-foreground">
            <div className="rounded-lg border p-4">
              Esta etapa ya deja visible vigencia, cobertura y descuentos por ítem; promociones
              temporales por fecha, volumen y combinación siguen reservadas.
            </div>
            <div className="rounded-lg border p-4">
              Precios especiales por cliente, canal, vendedor o condición comercial quedan
              reservados para la siguiente fase.
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

export default function ListasPreciosPage() {
  const {
    listas,
    loading,
    error,
    getById,
    crear,
    actualizar,
    eliminar,
    upsertItem,
    removeItem,
    refetch,
  } = useListasPrecios()
  const { monedas } = useItemsConfig()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("todos")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingList, setEditingList] = useState<ListaPreciosDetalle | null>(null)
  const [detailList, setDetailList] = useState<ListaPreciosDetalle | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase().trim()
    return listas.filter((list) => {
      const matchesSearch =
        term === "" ||
        list.nombre.toLowerCase().includes(term) ||
        (list.monedaSimbolo ?? "").toLowerCase().includes(term)

      const matchesStatus =
        statusFilter === "todos" ||
        (statusFilter === "activas" && list.activa) ||
        (statusFilter === "vigentes" && isCurrentList(list)) ||
        (statusFilter === "inactivas" && !list.activa) ||
        (statusFilter === "default" && list.esDefault)

      return matchesSearch && matchesStatus
    })
  }, [listas, searchTerm, statusFilter])

  const kpis = {
    total: listas.length,
    activas: listas.filter((list) => list.activa).length,
    vigentes: listas.filter((list) => isCurrentList(list)).length,
    defaults: listas.filter((list) => list.esDefault).length,
    conVencimiento: listas.filter((list) => Boolean(list.vigenciaHasta)).length,
  }
  const highlightedList =
    detailList && filtered.some((list) => list.id === detailList.id)
      ? detailList
      : (filtered[0] ?? null)
  const highlightedFields = highlightedList
    ? [
        { label: "Moneda", value: highlightedList.monedaSimbolo ?? `#${highlightedList.monedaId}` },
        { label: "Vigencia desde", value: formatDate(highlightedList.vigenciaDesde) },
        { label: "Vigencia hasta", value: formatDate(highlightedList.vigenciaHasta) },
        { label: "Estado vigencia", value: getValidityStatus(highlightedList) },
        { label: "Prioridad comercial", value: getCommercialPriority(highlightedList) },
        { label: "Predeterminada", value: highlightedList.esDefault ? "Sí" : "No" },
      ]
    : []

  const handleOpenDetail = async (list: ListaPrecios) => {
    setIsDetailOpen(true)
    setLoadingDetail(true)
    const detail = await getById(list.id)
    setDetailList(detail)
    setLoadingDetail(false)
  }

  const handleOpenEdit = async (list: ListaPrecios) => {
    const detail = await getById(list.id)
    setEditingList(detail)
    setIsFormOpen(true)
  }

  const handleSaveList = async (id: number | null, payload: CreateListaPreciosDto) => {
    const ok = id ? await actualizar(id, payload) : await crear(payload)
    if (ok) await refetch()
    return ok
  }

  const handleDelete = async (list: ListaPrecios) => {
    if (!window.confirm(`¿Eliminar la lista ${list.nombre}?`)) return
    const ok = await eliminar(list.id)
    if (ok) {
      await refetch()
      if (detailList?.id === list.id) {
        setDetailList(null)
        setIsDetailOpen(false)
      }
    }
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Listas de Precios</h1>
          <p className="text-muted-foreground">
            Maestro real de listas con detalle por producto y estructura preparada para reglas
            heredadas más complejas.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingList(null)
            setIsFormOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva Lista
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total listas</p>
            <p className="mt-1 text-2xl font-bold">{kpis.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Activas</p>
            <p className="mt-1 text-2xl font-bold text-green-600">{kpis.activas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Vigentes hoy</p>
            <p className="mt-1 text-2xl font-bold text-blue-600">{kpis.vigentes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Default</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">{kpis.defaults}</p>
          </CardContent>
        </Card>
      </div>

      {highlightedList ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardDescription>Lista destacada</CardDescription>
              <CardTitle className="mt-1 text-xl">{highlightedList.nombre}</CardTitle>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                {getCommercialPriority(highlightedList)}.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {highlightedList.esDefault ? <Badge variant="secondary">Default</Badge> : null}
              <Badge
                variant={
                  isCurrentList(highlightedList)
                    ? "outline"
                    : highlightedList.activa
                      ? "outline"
                      : "secondary"
                }
              >
                {isCurrentList(highlightedList)
                  ? "Vigente"
                  : highlightedList.activa
                    ? "Activa"
                    : "Inactiva"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={highlightedFields} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o moneda..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="activas">Activas</SelectItem>
                <SelectItem value="vigentes">Vigentes</SelectItem>
                <SelectItem value="inactivas">Inactivas</SelectItem>
                <SelectItem value="default">Predeterminadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Maestro de Listas ({filtered.length})</CardTitle>
          <CardDescription>
            El detalle de productos ya opera sobre la API actual; promociones y precios especiales
            quedan preparados como segunda fase.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Moneda</TableHead>
                <TableHead>Vigencia</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Circuito</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Cargando listas...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No hay listas para mostrar.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((list) => (
                  <TableRow
                    key={list.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => handleOpenDetail(list)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{list.nombre}</span>
                        {list.esDefault && <Badge variant="secondary">Default</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>{list.monedaSimbolo ?? `#${list.monedaId}`}</TableCell>
                    <TableCell>
                      <p>{formatDate(list.vigenciaDesde)}</p>
                      <p className="text-xs text-muted-foreground">
                        hasta {formatDate(list.vigenciaHasta)}
                      </p>
                    </TableCell>
                    <TableCell>
                      {isCurrentList(list) ? (
                        <Badge
                          variant="outline"
                          className="border-green-200 bg-green-50 text-green-700"
                        >
                          Vigente
                        </Badge>
                      ) : list.activa ? (
                        <Badge variant="outline">Activa</Badge>
                      ) : (
                        <Badge variant="secondary">Inactiva</Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-65 text-sm text-muted-foreground">
                      {getValidityStatus(list)}
                    </TableCell>
                    <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDetail(list)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(list)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(list)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Percent className="h-4 w-4" /> Promociones heredadas
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {kpis.vigentes} listas vigentes y {kpis.conVencimiento} con fecha de cierre dejan una
            base real para sumar promociones temporales en la siguiente etapa.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Star className="h-4 w-4" /> Precios especiales
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {kpis.defaults} listas predeterminadas ya ordenan la operación comercial sin reescribir
            la vista cuando lleguen precios especiales.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4" /> Ítems operativos
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {kpis.activas} listas activas ya mantienen precio y descuento por producto con
            persistencia real sobre la API actual.
          </CardContent>
        </Card>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingList ? "Editar lista de precios" : "Nueva lista de precios"}
            </DialogTitle>
            <DialogDescription>
              Alta y mantenimiento del maestro comercial con campos actuales y estructura heredada.
            </DialogDescription>
          </DialogHeader>
          <PriceListForm
            key={editingList ? `edit-${editingList.id}` : `new-${monedas[0]?.id ?? 0}`}
            list={editingList}
            onClose={() => setIsFormOpen(false)}
            onSaved={() => {
              setIsFormOpen(false)
              setEditingList(null)
            }}
            saveList={handleSaveList}
            monedas={monedas}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailList?.nombre ?? "Detalle de lista"}</DialogTitle>
            <DialogDescription>
              {detailList ? `${detailList.items.length} productos asociados` : "Cargando..."}
            </DialogDescription>
          </DialogHeader>

          {loadingDetail ? (
            <div className="py-12 text-center text-muted-foreground">Cargando detalle...</div>
          ) : detailList ? (
            <PriceListDetail
              list={detailList}
              onChanged={setDetailList}
              upsert={upsertItem}
              remove={removeItem}
            />
          ) : (
            <p className="py-8 text-center text-muted-foreground">No se pudo cargar la lista.</p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={() => setIsDetailOpen(false)}
            >
              Cerrar
            </Button>
            {detailList && (
              <Button
                onClick={() => {
                  setIsDetailOpen(false)
                  setEditingList(detailList)
                  setIsFormOpen(true)
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Editar lista
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
