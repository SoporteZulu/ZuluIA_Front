"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  Boxes,
  FolderTree,
  Package,
  RefreshCw,
  Search,
  ShieldAlert,
  Tag,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { apiGet } from "@/lib/api"
import { useItemsConfig } from "@/lib/hooks/useItems"
import type { CategoriaItem, Item, PagedResult } from "@/lib/types/items"

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

export default function CategoriasPage() {
  const { categorias, loading, loading: loadingCategorias, error } = useItemsConfig()
  const [itemsCatalogo, setItemsCatalogo] = useState<Item[]>([])
  const [itemsLoading, setItemsLoading] = useState(true)
  const [itemsError, setItemsError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [selectedCategoria, setSelectedCategoria] = useState<CategoriaItem | null>(null)

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

  const filteredCategorias = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) {
      return categorias
    }

    return categorias.filter((categoria) => {
      const linkedItems = usageByCategoria.get(categoria.id) ?? []
      return (
        categoria.codigo.toLowerCase().includes(term) ||
        categoria.descripcion.toLowerCase().includes(term) ||
        linkedItems.some(
          (item) =>
            item.codigo.toLowerCase().includes(term) ||
            item.descripcion.toLowerCase().includes(term)
        )
      )
    })
  }, [categorias, search, usageByCategoria])

  const categoriasConItems = categorias.filter(
    (categoria) => (usageByCategoria.get(categoria.id) ?? []).length > 0
  )
  const categoriasSinItems = categorias.length - categoriasConItems.length
  const itemsSinCategoria = itemsCatalogo.filter((item) => !item.categoriaId)
  const categoriasSinStockControl = categorias.filter((categoria) => {
    const linkedItems = usageByCategoria.get(categoria.id) ?? []
    return linkedItems.length > 0 && linkedItems.every((item) => !item.manejaStock)
  })
  const categoriaMayorUso = categorias.reduce<CategoriaItem | null>((top, categoria) => {
    const currentCount = (usageByCategoria.get(categoria.id) ?? []).length
    const topCount = top ? (usageByCategoria.get(top.id) ?? []).length : -1
    return currentCount > topCount ? categoria : top
  }, null)

  const categoriasOperativas = useMemo(() => {
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
        }
      })
      .sort((left, right) => {
        if (right.sinStock !== left.sinStock) {
          return right.sinStock - left.sinStock
        }

        if (left.linkedItems.length !== right.linkedItems.length) {
          return left.linkedItems.length - right.linkedItems.length
        }

        return left.categoria.codigo.localeCompare(right.categoria.codigo)
      })
  }, [categorias, usageByCategoria])

  const categoriaDestacada = categoriasOperativas[0] ?? null

  const selectedItems = selectedCategoria ? (usageByCategoria.get(selectedCategoria.id) ?? []) : []

  const radarCatalogo = [
    {
      title: "Ítems sin categoría",
      value: itemsSinCategoria.length,
      description: "Productos activos que siguen fuera del maestro de categorías visible.",
      icon: <ShieldAlert className="h-4 w-4 text-amber-600" />,
    },
    {
      title: "Categorías sin stock control",
      value: categoriasSinStockControl.length,
      description: "Categorías con artículos activos que no usan circuito de stock.",
      icon: <Wrench className="h-4 w-4 text-sky-700" />,
    },
    {
      title: "Cobertura de catálogo",
      value: `${categoriasConItems.length}/${categorias.length || 0}`,
      description: "Categorías con al menos un producto activo vinculado.",
      icon: <Boxes className="h-4 w-4 text-emerald-700" />,
    },
    {
      title: "Categorías huérfanas",
      value: categoriasSinItems,
      description: "Categorías sin uso dentro del lote activo consultado.",
      icon: <Tag className="h-4 w-4 text-rose-600" />,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categorías</h1>
          <p className="mt-1 text-muted-foreground">
            Consulta de categorías del backend y su uso dentro del catálogo activo. La API actual no
            expone altas, edición ni jerarquías, por eso esta vista evita acciones no soportadas.
          </p>
        </div>

        <Button variant="outline" onClick={() => void fetchItemsCatalogo()} disabled={itemsLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${itemsLoading ? "animate-spin" : ""}`} />
          Actualizar catálogo asociado
        </Button>
      </div>

      {(error || itemsError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Categorías de inventario</AlertTitle>
          <AlertDescription>{error ?? itemsError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Categorías disponibles"
          value={categorias.length}
          description="Leídas desde /api/categorias-items"
          icon={<FolderTree className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Con productos activos"
          value={categoriasConItems.length}
          description="Con al menos un producto asociado en el catálogo cargado"
          icon={<Package className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Sin asociación visible"
          value={categoriasSinItems}
          description="Categorías sin productos dentro del lote activo consultado"
          icon={<Tag className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Mayor uso"
          value={categoriaMayorUso?.codigo ?? "-"}
          description={
            categoriaMayorUso
              ? `${(usageByCategoria.get(categoriaMayorUso.id) ?? []).length} productos activos vinculados`
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

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Radar de categorías</CardTitle>
            <CardDescription>
              Señales de cobertura y riesgo del maestro usando sólo categorías e ítems activos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {categoriasOperativas.slice(0, 4).map((entry) => (
              <div key={entry.categoria.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{entry.categoria.descripcion}</p>
                    <p className="text-xs text-muted-foreground">{entry.categoria.codigo}</p>
                  </div>
                  <Badge
                    variant={
                      entry.linkedItems.length === 0
                        ? "outline"
                        : entry.sinStock > 0
                          ? "secondary"
                          : "default"
                    }
                  >
                    {entry.linkedItems.length === 0
                      ? "Sin uso"
                      : entry.sinStock > 0
                        ? `${entry.sinStock} sin stock`
                        : "Con cobertura"}
                  </Badge>
                </div>
                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <span className="text-muted-foreground">Activos</span>
                    <p className="font-medium">{entry.linkedItems.length}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Productos</span>
                    <p className="font-medium">{entry.productos}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Servicios</span>
                    <p className="font-medium">{entry.servicios}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Stock control</span>
                    <p className="font-medium">{entry.conStockControl}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Categoría destacada</CardTitle>
            <CardDescription>
              Lectura rápida de la categoría con más tensión operativa dentro del lote activo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categoriaDestacada ? (
              <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/70 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-amber-900">Seguimiento sugerido</p>
                    <h3 className="mt-1 text-xl font-semibold text-amber-950">
                      {categoriaDestacada.categoria.descripcion}
                    </h3>
                    <p className="text-sm text-amber-900/80">
                      {categoriaDestacada.categoria.codigo}
                    </p>
                  </div>
                  <Badge variant="outline">{categoriaDestacada.linkedItems.length} activos</Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-amber-200 bg-white/70 p-3">
                    <p className="text-xs uppercase tracking-wide text-amber-900/70">
                      Riesgo visible
                    </p>
                    <p className="mt-1 text-sm font-medium text-amber-950">
                      {categoriaDestacada.linkedItems.length === 0
                        ? "Categoría sin uso activo"
                        : categoriaDestacada.sinStock > 0
                          ? `${categoriaDestacada.sinStock} artículos sin stock`
                          : "Sin tensión inmediata"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-white/70 p-3">
                    <p className="text-xs uppercase tracking-wide text-amber-900/70">Mix visible</p>
                    <p className="mt-1 text-sm font-medium text-amber-950">
                      {categoriaDestacada.productos} prod. · {categoriaDestacada.servicios} serv. ·{" "}
                      {categoriaDestacada.financieros} fin.
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => setSelectedCategoria(categoriaDestacada.categoria)}
                >
                  Ver productos vinculados
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay categorías suficientes para destacar dentro del catálogo cargado.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catálogo de categorías</CardTitle>
          <CardDescription>
            Busca por código, descripción o por productos ya vinculados. El detalle muestra los
            artículos activos de cada categoría dentro del catálogo consultado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Buscar categoría o producto vinculado"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {loading || loadingCategorias || itemsLoading ? (
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
                  <TableHead className="text-right">Productos activos</TableHead>
                  <TableHead className="text-right">Sin stock</TableHead>
                  <TableHead>Estado operativo</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategorias.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No hay categorías que coincidan con la búsqueda actual.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCategorias.map((categoria) => {
                    const linkedItems = usageByCategoria.get(categoria.id) ?? []
                    const sinStock = linkedItems.filter(
                      (item) => Number(item.stock ?? 0) <= 0
                    ).length
                    return (
                      <TableRow key={categoria.id}>
                        <TableCell className="font-mono text-sm">{categoria.codigo}</TableCell>
                        <TableCell className="font-medium">{categoria.descripcion}</TableCell>
                        <TableCell className="text-right">{linkedItems.length}</TableCell>
                        <TableCell className="text-right">{sinStock}</TableCell>
                        <TableCell>
                          {linkedItems.length > 0 ? (
                            <Badge
                              variant="secondary"
                              className={
                                sinStock > 0
                                  ? "bg-amber-500/10 text-amber-700"
                                  : "bg-green-500/10 text-green-700"
                              }
                            >
                              {sinStock > 0 ? "Con quiebres" : "En uso"}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Sin productos activos</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedCategoria(categoria)}
                          >
                            Ver productos
                          </Button>
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

      <Dialog
        open={Boolean(selectedCategoria)}
        onOpenChange={(open) => !open && setSelectedCategoria(null)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedCategoria?.codigo} - {selectedCategoria?.descripcion}
            </DialogTitle>
            <DialogDescription>
              Productos activos vinculados a esta categoría dentro del catálogo actualmente cargado.
            </DialogDescription>
          </DialogHeader>

          {selectedCategoria && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Código</CardTitle>
                  </CardHeader>
                  <CardContent className="font-mono text-sm">
                    {selectedCategoria.codigo}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Descripción</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">{selectedCategoria.descripcion}</CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Productos asociados</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm font-semibold">
                    {selectedItems.length}
                  </CardContent>
                </Card>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">P. venta</TableHead>
                    <TableHead className="text-right">Stock mín.</TableHead>
                    <TableHead>Tipo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        No hay productos activos vinculados a esta categoría en el catálogo cargado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    selectedItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm">{item.codigo}</TableCell>
                        <TableCell className="font-medium">{item.descripcion}</TableCell>
                        <TableCell className="text-right">${item.precioVenta.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{item.stockMinimo}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {item.esProducto
                              ? "Producto"
                              : item.esServicio
                                ? "Servicio"
                                : "Financiero"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedCategoria(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
