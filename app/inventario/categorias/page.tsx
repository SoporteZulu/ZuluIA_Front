"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  Boxes,
  FolderTree,
  Pencil,
  Plus,
  RefreshCcw,
  RefreshCw,
  Search,
  ShieldAlert,
  Tag,
  Trash2,
  Wrench,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { Textarea } from "@/components/ui/textarea"
import { apiGet } from "@/lib/api"
import { useLegacyLocalCollection } from "@/lib/hooks/useLegacyLocalCollection"
import { useItemsConfig } from "@/lib/hooks/useItems"
import type { CategoriaItem, Item, PagedResult } from "@/lib/types/items"

const CATEGORIES_STORAGE_KEY = "inventory-categories-local-overlay"

type CategoryStatus = "activa" | "revision" | "inactiva"

type LocalCategoryRow = {
  id: string
  backendId: number | null
  codigo: string
  descripcion: string
  parentId: string | null
  estado: CategoryStatus
  observacion: string
  source: "backend" | "overlay"
}

type CategoryFormState = {
  codigo: string
  descripcion: string
  parentId: string
  estado: CategoryStatus
  observacion: string
}

function SummaryCard({
  title,
  value,
  description,
  icon,
}: {
  title: string
  value: string | number
  description: string
  icon: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function buildRowsFromBackend(categorias: CategoriaItem[]): LocalCategoryRow[] {
  return categorias
    .map((categoria) => ({
      id: `backend-${categoria.id}`,
      backendId: categoria.id,
      codigo: categoria.codigo,
      descripcion: categoria.descripcion,
      parentId: null,
      estado: "activa" as const,
      observacion: "Sin observación adicional.",
      source: "backend" as const,
    }))
    .sort((left, right) => left.codigo.localeCompare(right.codigo))
}

function emptyForm(): CategoryFormState {
  return {
    codigo: "",
    descripcion: "",
    parentId: "__none__",
    estado: "activa",
    observacion: "",
  }
}

function formFromRow(row: LocalCategoryRow): CategoryFormState {
  return {
    codigo: row.codigo,
    descripcion: row.descripcion,
    parentId: row.parentId ?? "__none__",
    estado: row.estado,
    observacion: row.observacion,
  }
}

function getStatusBadge(status: CategoryStatus) {
  if (status === "activa") {
    return <Badge>Activa</Badge>
  }

  if (status === "revision") {
    return <Badge variant="secondary">En revisión</Badge>
  }

  return <Badge variant="outline">Inactiva</Badge>
}

function getOperationalBadge(linkedItems: Item[], sinStock: number) {
  if (linkedItems.length === 0) {
    return <Badge variant="outline">Sin productos activos</Badge>
  }

  if (sinStock > 0) {
    return (
      <Badge variant="secondary" className="bg-amber-500/10 text-amber-700">
        {sinStock} sin stock
      </Badge>
    )
  }

  return (
    <Badge variant="secondary" className="bg-green-500/10 text-green-700">
      En uso
    </Badge>
  )
}

export default function CategoriasPage() {
  const { categorias, loading: loadingCategorias, error } = useItemsConfig()
  const [itemsCatalogo, setItemsCatalogo] = useState<Item[]>([])
  const [itemsLoading, setItemsLoading] = useState(true)
  const [itemsError, setItemsError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<CategoryFormState>(emptyForm())
  const [formError, setFormError] = useState<string | null>(null)
  const [hasOverlayKey, setHasOverlayKey] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return true
    }

    return window.localStorage.getItem(CATEGORIES_STORAGE_KEY) !== null
  })
  const { rows, setRows } = useLegacyLocalCollection<LocalCategoryRow>(CATEGORIES_STORAGE_KEY, [])

  const fetchItemsCatalogo = async () => {
    setItemsLoading(true)
    setItemsError(null)
    try {
      const response = await apiGet<PagedResult<Item>>(
        "/api/items?soloActivos=true&page=1&pageSize=500"
      )
      setItemsCatalogo(response.items ?? [])
    } catch (fetchError) {
      setItemsError(
        fetchError instanceof Error ? fetchError.message : "No se pudo cargar el catálogo activo."
      )
      setItemsCatalogo([])
    } finally {
      setItemsLoading(false)
    }
  }

  useEffect(() => {
    void fetchItemsCatalogo()
  }, [])

  useEffect(() => {
    if (loadingCategorias || hasOverlayKey || categorias.length === 0) {
      return
    }

    setRows(buildRowsFromBackend(categorias))
    setHasOverlayKey(true)
  }, [categorias, hasOverlayKey, loadingCategorias, setRows])

  const usageByCategoria = useMemo(() => {
    const usage = new Map<number, Item[]>()
    itemsCatalogo.forEach((item) => {
      if (!item.categoriaId) {
        return
      }

      const existing = usage.get(item.categoriaId) ?? []
      existing.push(item)
      usage.set(item.categoriaId, existing)
    })
    return usage
  }, [itemsCatalogo])

  const rowsWithMetrics = useMemo(() => {
    return rows
      .map((row) => {
        const linkedItems = row.backendId ? (usageByCategoria.get(row.backendId) ?? []) : []
        const productos = linkedItems.filter((item) => item.esProducto).length
        const servicios = linkedItems.filter((item) => item.esServicio).length
        const financieros = linkedItems.filter((item) => item.esFinanciero).length
        const conStockControl = linkedItems.filter((item) => item.manejaStock).length
        const sinStock = linkedItems.filter((item) => Number(item.stock ?? 0) <= 0).length

        return {
          row,
          linkedItems,
          productos,
          servicios,
          financieros,
          conStockControl,
          sinStock,
        }
      })
      .sort((left, right) => left.row.codigo.localeCompare(right.row.codigo))
  }, [rows, usageByCategoria])

  const rowMap = useMemo(
    () => new Map(rowsWithMetrics.map((entry) => [entry.row.id, entry])),
    [rowsWithMetrics]
  )

  const visibleCategorias = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) {
      return rowsWithMetrics
    }

    return rowsWithMetrics.filter((entry) => {
      const parentLabel = entry.row.parentId
        ? (rowMap.get(entry.row.parentId)?.row.descripcion ?? "")
        : ""

      return (
        entry.row.codigo.toLowerCase().includes(term) ||
        entry.row.descripcion.toLowerCase().includes(term) ||
        entry.row.observacion.toLowerCase().includes(term) ||
        parentLabel.toLowerCase().includes(term) ||
        entry.linkedItems.some(
          (item) =>
            item.codigo.toLowerCase().includes(term) ||
            item.descripcion.toLowerCase().includes(term)
        )
      )
    })
  }, [rowMap, rowsWithMetrics, search])

  useEffect(() => {
    if (!selectedId && visibleCategorias[0]) {
      setSelectedId(visibleCategorias[0].row.id)
      return
    }

    if (selectedId && !visibleCategorias.some((entry) => entry.row.id === selectedId)) {
      setSelectedId(visibleCategorias[0]?.row.id ?? null)
    }
  }, [selectedId, visibleCategorias])

  const highlighted = visibleCategorias.find((entry) => entry.row.id === selectedId) ?? null
  const itemsSinCategoria = itemsCatalogo.filter((item) => !item.categoriaId)
  const categoriasConItems = rowsWithMetrics.filter((entry) => entry.linkedItems.length > 0).length
  const categoriasSinItems = rowsWithMetrics.length - categoriasConItems
  const categoriasSinStockControl = rowsWithMetrics.filter(
    (entry) => entry.linkedItems.length > 0 && entry.conStockControl === 0
  ).length
  const overlaysLocales = rowsWithMetrics.filter((entry) => entry.row.source === "overlay").length
  const categoriaMayorUso = rowsWithMetrics.reduce<(typeof rowsWithMetrics)[number] | null>(
    (top, entry) => {
      if (!top) {
        return entry
      }

      return entry.linkedItems.length > top.linkedItems.length ? entry : top
    },
    null
  )

  const radarCatalogo = [
    {
      title: "Ítems sin categoría",
      value: itemsSinCategoria.length,
      description: "Productos activos que siguen fuera del maestro operativo visible.",
      icon: <ShieldAlert className="h-4 w-4 text-amber-600" />,
    },
    {
      title: "Sin stock control",
      value: categoriasSinStockControl,
      description: "Categorías con artículos activos que hoy no usan circuito de stock.",
      icon: <Wrench className="h-4 w-4 text-sky-700" />,
    },
    {
      title: "Cobertura del catálogo",
      value: `${categoriasConItems}/${rowsWithMetrics.length || 0}`,
      description: "Categorías visibles con al menos un producto activo vinculado.",
      icon: <Boxes className="h-4 w-4 text-emerald-700" />,
    },
    {
      title: "Overlay local",
      value: overlaysLocales,
      description: "Altas locales agregadas mientras la API siga sin ABM de categorías.",
      icon: <Tag className="h-4 w-4 text-rose-600" />,
    },
  ]

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setFormError(null)
    setDialogOpen(true)
  }

  const openEdit = (row: LocalCategoryRow) => {
    setEditingId(row.id)
    setForm(formFromRow(row))
    setFormError(null)
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!form.codigo.trim() || !form.descripcion.trim()) {
      setFormError("Completá código y descripción para guardar la categoría.")
      return
    }

    const duplicate = rows.find(
      (row) =>
        row.id !== editingId && row.codigo.trim().toLowerCase() === form.codigo.trim().toLowerCase()
    )
    if (duplicate) {
      setFormError("Ya existe otra categoría con el mismo código dentro del overlay actual.")
      return
    }

    const previous = editingId ? (rows.find((row) => row.id === editingId) ?? null) : null
    const nextRow: LocalCategoryRow = {
      id: editingId ?? `category-local-${Date.now()}`,
      backendId: previous?.backendId ?? null,
      codigo: form.codigo.trim(),
      descripcion: form.descripcion.trim(),
      parentId: form.parentId === "__none__" ? null : form.parentId,
      estado: form.estado,
      observacion: form.observacion.trim() || "Sin observación adicional.",
      source: previous?.source ?? "overlay",
    }

    setRows((current) => {
      const rest = current.filter((row) => row.id !== nextRow.id)
      return [...rest, nextRow].sort((left, right) => left.codigo.localeCompare(right.codigo))
    })
    setSelectedId(nextRow.id)
    setDialogOpen(false)
  }

  const handleDelete = (row: LocalCategoryRow) => {
    setRows((current) =>
      current
        .filter((entry) => entry.id !== row.id)
        .map((entry) =>
          entry.parentId === row.id
            ? {
                ...entry,
                parentId: null,
              }
            : entry
        )
    )

    if (selectedId === row.id) {
      setSelectedId(null)
    }
  }

  const handleReset = () => {
    const next = buildRowsFromBackend(categorias)
    setRows(next)
    setSelectedId(next[0]?.id ?? null)
    setHasOverlayKey(true)
  }

  const parentOptions = rows.filter((row) => row.id !== editingId)

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categorías</h1>
          <p className="mt-1 text-muted-foreground">
            Consola híbrida entre el catálogo real del backend y un overlay local operativo. La API
            actual sigue sin publicar altas, edición ni jerarquías, así que la cobertura de ABM se
            mantiene en frontend sin inventar contratos nuevos.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => void fetchItemsCatalogo()}
            disabled={itemsLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${itemsLoading ? "animate-spin" : ""}`} />
            Actualizar catálogo asociado
          </Button>
          <Button variant="outline" className="bg-transparent" onClick={handleReset}>
            <RefreshCcw className="mr-2 h-4 w-4" /> Restablecer overlay
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Nueva categoría
          </Button>
        </div>
      </div>

      {(error || itemsError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Categorías de inventario</AlertTitle>
          <AlertDescription>{error ?? itemsError}</AlertDescription>
        </Alert>
      )}

      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Alcance actual</AlertTitle>
        <AlertDescription>
          Las categorías base se leen desde el backend, pero el mantenimiento operativo se sostiene
          con overlay local persistido en navegador hasta que exista un ABM real del maestro.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Categorías visibles"
          value={rowsWithMetrics.length}
          description="Base backend más overlay local vigente"
          icon={<FolderTree className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Con productos activos"
          value={categoriasConItems}
          description="Con al menos un producto asociado en el catálogo cargado"
          icon={<Boxes className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Sin asociación visible"
          value={categoriasSinItems}
          description="Categorías sin productos activos dentro del lote consultado"
          icon={<Tag className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Mayor uso"
          value={categoriaMayorUso?.row.codigo ?? "-"}
          description={
            categoriaMayorUso
              ? `${categoriaMayorUso.linkedItems.length} productos activos vinculados`
              : "Sin datos de asociación todavía"
          }
          icon={<FolderTree className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {radarCatalogo.map((item) => (
          <Card key={item.title}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                {item.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">{item.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Maestro operativo</CardTitle>
            <CardDescription>
              Busca por código, descripción, observación, categoría padre o productos ya vinculados.
            </CardDescription>
            <div className="relative mt-2 max-w-xl">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Buscar categoría o producto vinculado"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            {loadingCategorias || itemsLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Cargando categorías y asociaciones...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Jerarquía</TableHead>
                    <TableHead className="text-right">Productos</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleCategorias.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        No hay categorías que coincidan con la búsqueda actual.
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleCategorias.map((entry) => {
                      const parentLabel = entry.row.parentId
                        ? (rowMap.get(entry.row.parentId)?.row.descripcion ?? "Sin padre")
                        : "Raíz"

                      return (
                        <TableRow
                          key={entry.row.id}
                          className={
                            highlighted?.row.id === entry.row.id ? "bg-accent/40" : undefined
                          }
                        >
                          <TableCell
                            className="font-mono text-sm"
                            onClick={() => setSelectedId(entry.row.id)}
                          >
                            {entry.row.codigo}
                          </TableCell>
                          <TableCell onClick={() => setSelectedId(entry.row.id)}>
                            <div className="space-y-1">
                              <p className="font-medium">{entry.row.descripcion}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {entry.row.observacion}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell onClick={() => setSelectedId(entry.row.id)}>
                            {parentLabel}
                          </TableCell>
                          <TableCell
                            className="text-right"
                            onClick={() => setSelectedId(entry.row.id)}
                          >
                            {entry.linkedItems.length}
                          </TableCell>
                          <TableCell onClick={() => setSelectedId(entry.row.id)}>
                            {getOperationalBadge(entry.linkedItems, entry.sinStock)}
                          </TableCell>
                          <TableCell onClick={() => setSelectedId(entry.row.id)}>
                            <div className="flex flex-col gap-1">
                              {getStatusBadge(entry.row.estado)}
                              <span className="text-xs text-muted-foreground">
                                {entry.row.source === "backend" ? "Base real" : "Solo overlay"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEdit(entry.row)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(entry.row)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Categoría destacada</CardTitle>
              <CardDescription>
                Lectura rápida del registro seleccionado y su cobertura.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {highlighted ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {highlighted.row.codigo}
                      </p>
                      <h3 className="mt-1 text-xl font-semibold">{highlighted.row.descripcion}</h3>
                    </div>
                    {getStatusBadge(highlighted.row.estado)}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Jerarquía</p>
                      <p className="mt-1 text-sm font-medium">
                        {highlighted.row.parentId
                          ? (rowMap.get(highlighted.row.parentId)?.row.descripcion ?? "Sin padre")
                          : "Raíz"}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Origen</p>
                      <p className="mt-1 text-sm font-medium">
                        {highlighted.row.source === "backend" ? "Base real + overlay" : "Local"}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Productos activos</p>
                      <p className="mt-1 text-sm font-medium">{highlighted.linkedItems.length}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Sin stock</p>
                      <p className="mt-1 text-sm font-medium">{highlighted.sinStock}</p>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
                    {highlighted.row.observacion}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-sm font-semibold">Productos vinculados</h4>
                      {getOperationalBadge(highlighted.linkedItems, highlighted.sinStock)}
                    </div>
                    {highlighted.linkedItems.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No hay productos activos vinculados a esta categoría en el lote cargado.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {highlighted.linkedItems.slice(0, 5).map((item) => (
                          <div key={item.id} className="rounded-lg border p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-medium">{item.descripcion}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.codigo} · Stock mín. {item.stockMinimo}
                                </p>
                              </div>
                              <Badge variant="outline">
                                {item.esProducto
                                  ? "Producto"
                                  : item.esServicio
                                    ? "Servicio"
                                    : "Financiero"}
                              </Badge>
                            </div>
                          </div>
                        ))}
                        {highlighted.linkedItems.length > 5 && (
                          <p className="text-xs text-muted-foreground">
                            +{highlighted.linkedItems.length - 5} productos adicionales dentro del
                            lote activo.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hay categorías suficientes para mostrar detalle en la selección actual.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Radar operativo</CardTitle>
              <CardDescription>
                Señales rápidas del maestro según el lote consultado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {rowsWithMetrics
                .slice()
                .sort(
                  (left, right) =>
                    right.sinStock - left.sinStock ||
                    right.linkedItems.length - left.linkedItems.length
                )
                .slice(0, 3)
                .map((entry) => (
                  <div key={entry.row.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{entry.row.descripcion}</p>
                        <p className="text-xs text-muted-foreground">{entry.row.codigo}</p>
                      </div>
                      {getOperationalBadge(entry.linkedItems, entry.sinStock)}
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {entry.productos} prod. · {entry.servicios} serv. · {entry.financieros} fin. ·{" "}
                      {entry.conStockControl} con control de stock
                    </p>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
            <DialogDescription>
              El cambio se guarda sólo en el overlay local. Si el backend publica luego ABM real,
              podrá migrarse sin perder este criterio operativo.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Código</Label>
              <Input
                value={form.codigo}
                onChange={(event) =>
                  setForm((current) => ({ ...current, codigo: event.target.value }))
                }
                placeholder="CAT-MP"
              />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={form.estado}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, estado: value as CategoryStatus }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activa">Activa</SelectItem>
                  <SelectItem value="revision">En revisión</SelectItem>
                  <SelectItem value="inactiva">Inactiva</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Descripción</Label>
              <Input
                value={form.descripcion}
                onChange={(event) =>
                  setForm((current) => ({ ...current, descripcion: event.target.value }))
                }
                placeholder="Materia prima refrigerada"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Categoría padre</Label>
              <Select
                value={form.parentId}
                onValueChange={(value) => setForm((current) => ({ ...current, parentId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin categoría padre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin categoría padre</SelectItem>
                  {parentOptions.map((row) => (
                    <SelectItem key={row.id} value={row.id}>
                      {row.codigo} - {row.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Observación</Label>
              <Textarea
                rows={4}
                value={form.observacion}
                onChange={(event) =>
                  setForm((current) => ({ ...current, observacion: event.target.value }))
                }
                placeholder="Criterio de uso, familia principal o nota de migración"
              />
            </div>
          </div>

          {formError && <p className="text-sm text-red-500">{formError}</p>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Guardar categoría</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
