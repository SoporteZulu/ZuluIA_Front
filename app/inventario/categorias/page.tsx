"use client"

import { useMemo, useState } from "react"
import {
  AlertCircle,
  Boxes,
  CheckCircle2,
  FolderTree,
  Pencil,
  Plus,
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
import { useCategoriasItems, useItemsCatalogSnapshot } from "@/lib/hooks/useInventarioMaestros"
import type { CategoriaItem, Item } from "@/lib/types/items"

type CategoryFormState = {
  codigo: string
  descripcion: string
  parentId: string
  ordenNivel: string
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

function emptyForm(): CategoryFormState {
  return {
    codigo: "",
    descripcion: "",
    parentId: "__none__",
    ordenNivel: "",
    observacion: "",
  }
}

function formFromCategoria(categoria: CategoriaItem): CategoryFormState {
  return {
    codigo: categoria.codigo,
    descripcion: categoria.descripcion,
    parentId: categoria.parentId ? String(categoria.parentId) : "__none__",
    ordenNivel: categoria.ordenNivel ?? "",
    observacion: "",
  }
}

function getStatusBadge(activo: boolean) {
  if (activo) {
    return <Badge>Activa</Badge>
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
  const {
    categorias,
    loading: loadingCategorias,
    saving,
    error,
    crear,
    actualizar,
    eliminar,
    activar,
    refetch,
  } = useCategoriasItems()
  const {
    items: itemsCatalogo,
    loading: itemsLoading,
    error: itemsError,
  } = useItemsCatalogSnapshot()

  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState<CategoryFormState>(emptyForm())
  const [formError, setFormError] = useState<string | null>(null)
  const [savingForm, setSavingForm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const categoryMap = useMemo(
    () => new Map(categorias.map((categoria) => [categoria.id, categoria])),
    [categorias]
  )

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
    return categorias
      .map((categoria) => {
        const linkedItems = usageByCategoria.get(categoria.id) ?? []
        const productos = linkedItems.filter((item) => item.esProducto).length
        const servicios = linkedItems.filter((item) => item.esServicio).length
        const financieros = linkedItems.filter((item) => item.esFinanciero).length
        const conStockControl = linkedItems.filter((item) => item.manejaStock).length
        const sinStock = linkedItems.filter((item) => Number(item.stock ?? 0) <= 0).length

        return {
          categoria,
          linkedItems,
          productos,
          servicios,
          financieros,
          conStockControl,
          sinStock,
          parentLabel: categoria.parentId
            ? (categoryMap.get(categoria.parentId)?.descripcion ?? "Raíz no encontrada")
            : "Categoría raíz",
        }
      })
      .sort((left, right) => left.categoria.codigo.localeCompare(right.categoria.codigo))
  }, [categorias, categoryMap, usageByCategoria])

  const visibleCategorias = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) {
      return rowsWithMetrics
    }

    return rowsWithMetrics.filter((entry) => {
      return (
        entry.categoria.codigo.toLowerCase().includes(term) ||
        entry.categoria.descripcion.toLowerCase().includes(term) ||
        entry.parentLabel.toLowerCase().includes(term) ||
        entry.linkedItems.some(
          (item) =>
            item.codigo.toLowerCase().includes(term) ||
            item.descripcion.toLowerCase().includes(term) ||
            (item.marcaDescripcion ?? "").toLowerCase().includes(term)
        )
      )
    })
  }, [rowsWithMetrics, search])

  const effectiveSelectedId = visibleCategorias.some((entry) => entry.categoria.id === selectedId)
    ? selectedId
    : (visibleCategorias[0]?.categoria.id ?? null)

  const highlighted =
    visibleCategorias.find((entry) => entry.categoria.id === effectiveSelectedId) ??
    visibleCategorias[0] ??
    null

  const categoriaToDelete = deleteId ? (categoryMap.get(deleteId) ?? null) : null
  const itemsSinCategoria = itemsCatalogo.filter((item) => !item.categoriaId)
  const categoriasConItems = visibleCategorias.filter(
    (entry) => entry.linkedItems.length > 0
  ).length
  const categoriasSinItems = visibleCategorias.length - categoriasConItems
  const categoriasSinStockControl = visibleCategorias.filter(
    (entry) => entry.linkedItems.length > 0 && entry.conStockControl === 0
  ).length
  const categoriasInactivas = visibleCategorias.filter((entry) => !entry.categoria.activo).length
  const categoriaMayorUso = visibleCategorias.reduce<(typeof visibleCategorias)[number] | null>(
    (top, entry) => {
      if (!top) {
        return entry
      }

      return entry.linkedItems.length > top.linkedItems.length ? entry : top
    },
    null
  )

  const pageLoading = loadingCategorias || itemsLoading
  const pageError = error ?? itemsError

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setFormError(null)
    setDialogOpen(true)
  }

  const openEdit = (categoria: CategoriaItem) => {
    setSelectedId(categoria.id)
    setEditingId(categoria.id)
    setForm(formFromCategoria(categoria))
    setFormError(null)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.codigo.trim() || !form.descripcion.trim()) {
      setFormError("Completá código y descripción para guardar la categoría.")
      return
    }

    const duplicate = categorias.find(
      (categoria) =>
        categoria.id !== editingId &&
        categoria.codigo.trim().toLowerCase() === form.codigo.trim().toLowerCase()
    )

    if (duplicate) {
      setFormError("Ya existe otra categoría con el mismo código.")
      return
    }

    setSavingForm(true)
    setFormError(null)

    const parentId = form.parentId === "__none__" ? null : Number(form.parentId)
    const parent = parentId ? (categoryMap.get(parentId) ?? null) : null
    const ordenNivel = form.ordenNivel.trim() || null

    const ok = editingId
      ? await actualizar(editingId, {
          codigo: form.codigo.trim(),
          descripcion: form.descripcion.trim(),
          ordenNivel,
        })
      : await crear({
          parentId,
          codigo: form.codigo.trim(),
          descripcion: form.descripcion.trim(),
          nivel: parent ? Number(parent.nivel ?? 1) + 1 : 1,
          ordenNivel,
        })

    if (!ok) {
      setFormError(
        editingId ? "No se pudo actualizar la categoría." : "No se pudo crear la categoría."
      )
      setSavingForm(false)
      return
    }

    await refetch()
    setSavingForm(false)
    setDialogOpen(false)
    setEditingId(null)
    setForm(emptyForm())
  }

  const handleDelete = async () => {
    if (!categoriaToDelete) return

    setDeleting(true)
    const ok = await eliminar(categoriaToDelete.id)

    if (!ok) {
      setDeleting(false)
      return
    }

    await refetch()
    setDeleting(false)
    setDeleteId(null)
  }

  const handleActivate = async (categoria: CategoriaItem) => {
    await activar(categoria.id)
  }

  const parentOptions = categorias.filter(
    (categoria) => categoria.id !== editingId && categoria.activo
  )

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categorías</h1>
          <p className="mt-1 text-muted-foreground">
            Maestro de clasificación comercial sobre backend real, con lectura de uso y cobertura
            operativa del catálogo activo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="bg-transparent" onClick={() => void refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Actualizar
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Nueva categoría
          </Button>
        </div>
      </div>

      {pageError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Categorías</AlertTitle>
          <AlertDescription>{pageError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Ítems sin categoría"
          value={itemsSinCategoria.length}
          description="Productos activos que siguen fuera del maestro comercial visible"
          icon={<ShieldAlert className="h-4 w-4 text-amber-600" />}
        />
        <SummaryCard
          title="Sin stock control"
          value={categoriasSinStockControl}
          description="Categorías con artículos activos que hoy no usan circuito de stock"
          icon={<Wrench className="h-4 w-4 text-sky-700" />}
        />
        <SummaryCard
          title="Cobertura del catálogo"
          value={`${categoriasConItems}/${visibleCategorias.length || 0}`}
          description="Categorías con al menos un producto activo vinculado"
          icon={<Boxes className="h-4 w-4 text-emerald-700" />}
        />
        <SummaryCard
          title="Inactivas"
          value={categoriasInactivas}
          description="Categorías dadas de baja pero aún visibles para control funcional"
          icon={<Tag className="h-4 w-4 text-rose-600" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Matriz de categorías</CardTitle>
            <CardDescription>
              Clasificación activa del catálogo con uso real por productos, servicios y stock.
            </CardDescription>
            <div className="relative mt-2 max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar código, descripción, padre o ítem..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            {pageLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Cargando categorías operativas...
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Padre</TableHead>
                    <TableHead>Uso</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleCategorias.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        No se encontraron categorías.
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleCategorias.map((entry) => (
                      <TableRow
                        key={entry.categoria.id}
                        className={
                          highlighted?.categoria.id === entry.categoria.id
                            ? "bg-accent/40"
                            : undefined
                        }
                        onClick={() => setSelectedId(entry.categoria.id)}
                      >
                        <TableCell>
                          <div className="font-mono text-sm">{entry.categoria.codigo}</div>
                          <div className="text-xs text-muted-foreground">
                            Nivel {entry.categoria.nivel ?? 1}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{entry.categoria.descripcion}</div>
                          <div className="text-xs text-muted-foreground">
                            {entry.productos} productos, {entry.servicios} servicios,{" "}
                            {entry.financieros} financieros
                          </div>
                        </TableCell>
                        <TableCell>{entry.parentLabel}</TableCell>
                        <TableCell>
                          {getOperationalBadge(entry.linkedItems, entry.sinStock)}
                        </TableCell>
                        <TableCell>{getStatusBadge(Boolean(entry.categoria.activo))}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {!entry.categoria.activo && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => void handleActivate(entry.categoria)}
                                disabled={saving}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(entry.categoria)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(entry.categoria.id)}
                              disabled={!entry.categoria.activo}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
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
                Lectura rápida de la categoría más relevante en la vista actual.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {highlighted ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{highlighted.categoria.descripcion}</p>
                      <p className="mt-1 font-mono text-sm text-muted-foreground">
                        {highlighted.categoria.codigo}
                      </p>
                    </div>
                    {getStatusBadge(Boolean(highlighted.categoria.activo))}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">Ítems vinculados</p>
                      <p className="mt-2 font-medium">{highlighted.linkedItems.length}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">Padre</p>
                      <p className="mt-2 font-medium">{highlighted.parentLabel}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                    Uso real: {highlighted.productos} productos, {highlighted.servicios} servicios,{" "}
                    {highlighted.financieros} financieros.{" "}
                    {highlighted.sinStock > 0
                      ? `${highlighted.sinStock} ítems están sin stock visible.`
                      : "No hay alertas inmediatas de stock en la categoría."}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No hay categorías visibles.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FolderTree className="h-4 w-4" /> Radar del maestro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>{categoriasSinItems} categorías siguen sin uso visible en el catálogo activo.</p>
              <p>
                {categoriaMayorUso
                  ? `${categoriaMayorUso.categoria.descripcion} es la categoría con mayor utilización actual.`
                  : "Todavía no hay una categoría dominante en el catálogo activo."}
              </p>
              <p>
                El alta, edición, baja y reactivación ya operan sobre el backend real de categorías.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
            <DialogDescription>
              Gestión del maestro de categorías conectado al backend de inventario comercial.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código</Label>
                <Input
                  id="codigo"
                  value={form.codigo}
                  onChange={(event) => setForm((prev) => ({ ...prev, codigo: event.target.value }))}
                  placeholder="CAT-GRAL"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parentId">Categoría padre</Label>
                <Select
                  value={form.parentId}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, parentId: value }))}
                  disabled={Boolean(editingId)}
                >
                  <SelectTrigger id="parentId" className="w-full">
                    <SelectValue placeholder="Sin padre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin padre</SelectItem>
                    {parentOptions.map((categoria) => (
                      <SelectItem key={categoria.id} value={String(categoria.id)}>
                        {categoria.codigo} · {categoria.descripcion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editingId && (
                  <p className="text-xs text-muted-foreground">
                    El backend actual no expone cambio de padre en edición.
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Input
                id="descripcion"
                value={form.descripcion}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, descripcion: event.target.value }))
                }
                placeholder="Categoría principal"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ordenNivel">Orden nivel</Label>
                <Input
                  id="ordenNivel"
                  value={form.ordenNivel}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, ordenNivel: event.target.value }))
                  }
                  placeholder="1.10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="observacion">Observación operativa</Label>
                <Textarea
                  id="observacion"
                  rows={3}
                  value={form.observacion}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, observacion: event.target.value }))
                  }
                  placeholder="Referencia interna de uso"
                />
              </div>
            </div>
            {formError && <p className="text-sm text-red-500">{formError}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={() => setDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={() => void handleSave()} disabled={savingForm || saving}>
              {savingForm || saving
                ? "Guardando..."
                : editingId
                  ? "Guardar cambios"
                  : "Crear categoría"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(categoriaToDelete)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desactivar categoría</DialogTitle>
            <DialogDescription>
              Se desactivará la categoría seleccionada. Si todavía tiene ítems activos asociados, el
              backend bloqueará la operación.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            {categoriaToDelete
              ? `${categoriaToDelete.codigo} · ${categoriaToDelete.descripcion}`
              : "Sin categoría seleccionada."}
          </div>
          <DialogFooter>
            <Button variant="outline" className="bg-transparent" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={deleting || saving}
            >
              {deleting ? "Desactivando..." : "Desactivar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
