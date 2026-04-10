"use client"

import { useMemo, useState } from "react"
import {
  AlertCircle,
  ArrowRightLeft,
  Eye,
  Loader2,
  Package,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Warehouse,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useDepositos } from "@/lib/hooks/useDepositos"
import { useItems, useItemsConfig } from "@/lib/hooks/useItems"
import {
  useStockActions,
  useStockItem,
  useStockMovimientos,
  useStockResumen,
} from "@/lib/hooks/useStock"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"
import type { Item } from "@/lib/types/items"

type AjusteFormState = {
  depositoId: string
  nuevaCantidad: string
  observacion: string
}

type TransferFormState = {
  depositoOrigenId: string
  depositoDestinoId: string
  cantidad: string
  observacion: string
}

const emptyAjuste = (): AjusteFormState => ({
  depositoId: "",
  nuevaCantidad: "",
  observacion: "",
})

const emptyTransfer = (): TransferFormState => ({
  depositoOrigenId: "",
  depositoDestinoId: "",
  cantidad: "",
  observacion: "",
})

function formatMoney(amount: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDateTime(value?: string | null) {
  if (!value) return "-"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date)
}

function getCoverageStatus(item: Item) {
  if (!item.manejaStock) return "Sin gestion de stock"

  const stock = item.stock ?? 0
  if (stock <= 0) return "Sin cobertura"
  if (stock <= item.stockMinimo) return "Cobertura comprometida"
  if (item.stockMaximo !== null && stock > item.stockMaximo) return "Sobre cobertura"
  return "Cobertura operativa"
}

function getCatalogStatus(item: Item) {
  const visibleFields = [
    item.codigoBarras,
    item.descripcionAdicional,
    item.codigoAfip,
    item.categoriaId,
  ].filter(Boolean).length

  if (visibleFields >= 3) return "Ficha ampliada"
  if (visibleFields >= 1) return "Ficha operativa"
  return "Ficha base"
}

function getMovementScope(tipoMovimiento: string) {
  const normalized = tipoMovimiento.toLowerCase()

  if (normalized.includes("transfer")) return "Interdeposito"
  if (normalized.includes("ajuste")) return "Regularizacion"
  if (normalized.includes("compra") || normalized.includes("entrada")) return "Ingreso"
  if (normalized.includes("venta") || normalized.includes("salida")) return "Egreso"
  return "Movimiento manual"
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
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  )
}

function getStockBadge(item: Item) {
  const stock = item.stock ?? 0

  if (!item.manejaStock) return <Badge variant="outline">Sin gestión de stock</Badge>
  if (stock <= 0) return <Badge variant="destructive">Sin stock</Badge>
  if (stock <= item.stockMinimo) return <Badge variant="secondary">Bajo mínimo</Badge>
  return <Badge variant="default">Disponible</Badge>
}

export default function InventarioPage() {
  const sucursalId = useDefaultSucursalId()
  const {
    items,
    loading,
    error,
    totalCount,
    totalPages,
    page,
    setPage,
    search,
    setSearch,
    refetch,
  } = useItems()
  const { categorias } = useItemsConfig()
  const { depositos } = useDepositos(sucursalId)
  const {
    resumen,
    bajoMinimo,
    loading: loadingResumen,
    refetch: refetchResumen,
  } = useStockResumen(sucursalId)
  const { ajustar, transferir, loading: actionLoading, error: actionHookError } = useStockActions()

  const [filterCategory, setFilterCategory] = useState("todos")
  const [filterStock, setFilterStock] = useState<
    "todos" | "sin-stock" | "bajo-minimo" | "con-stock"
  >("todos")
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isAjusteOpen, setIsAjusteOpen] = useState(false)
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [ajusteForm, setAjusteForm] = useState<AjusteFormState>(emptyAjuste)
  const [transferForm, setTransferForm] = useState<TransferFormState>(emptyTransfer)

  const filteredProducts = useMemo(() => {
    return items.filter((item) => {
      const categoryMatch =
        filterCategory === "todos" || String(item.categoriaId ?? "sin") === filterCategory
      const stockValue = item.stock ?? 0
      const stockMatch =
        filterStock === "todos" ||
        (filterStock === "sin-stock" && stockValue <= 0) ||
        (filterStock === "bajo-minimo" &&
          item.manejaStock &&
          stockValue > 0 &&
          stockValue <= item.stockMinimo) ||
        (filterStock === "con-stock" && stockValue > item.stockMinimo)

      return categoryMatch && stockMatch
    })
  }, [filterCategory, filterStock, items])

  const selectedItem = useMemo(
    () => filteredProducts.find((item) => item.id === selectedItemId) ?? null,
    [filteredProducts, selectedItemId]
  )

  const { stock, loading: loadingStock } = useStockItem(selectedItem?.id)
  const {
    movimientos,
    loading: loadingMovimientos,
    desde,
    hasta,
    setDesde,
    setHasta,
    refetch: refetchMovimientos,
  } = useStockMovimientos(selectedItem?.id)

  const valorInventario = useMemo(() => {
    return items.reduce((acc, item) => acc + (item.stock ?? 0) * Number(item.precioCosto ?? 0), 0)
  }, [items])

  const itemsConDatosAmpliados = useMemo(
    () =>
      items.filter((item) =>
        Boolean(item.codigoBarras || item.descripcionAdicional || item.codigoAfip)
      ).length,
    [items]
  )

  const itemsConCoberturaComprometida = useMemo(
    () =>
      items.filter(
        (item) => item.manejaStock && (item.stock ?? 0) > 0 && (item.stock ?? 0) <= item.stockMinimo
      ).length,
    [items]
  )

  const featuredAlert = useMemo(() => {
    if (selectedItem) {
      return bajoMinimo.find((item) => item.itemId === selectedItem.id) ?? bajoMinimo[0] ?? null
    }

    return bajoMinimo[0] ?? null
  }, [bajoMinimo, selectedItem])

  const featuredAlertItem = useMemo(() => {
    if (!featuredAlert) {
      return selectedItem
    }

    return items.find((item) => item.id === featuredAlert.itemId) ?? selectedItem
  }, [featuredAlert, items, selectedItem])

  const ultimoMovimientoVisible = movimientos[0] ?? null
  const ultimaActualizacionStock = stock?.depositos
    ?.map((deposito) => deposito.updatedAt)
    .filter(Boolean)
    .sort()
    .at(-1)

  const openDetail = (item: Item) => {
    setSelectedItemId(item.id)
    setActionError(null)
    setIsDetailOpen(true)
  }

  const openAjuste = (item: Item) => {
    setSelectedItemId(item.id)
    setActionError(null)
    setAjusteForm({
      depositoId: stock?.depositos?.[0] ? String(stock.depositos[0].depositoId) : "",
      nuevaCantidad: String(item.stock ?? 0),
      observacion: "",
    })
    setIsAjusteOpen(true)
  }

  const openTransfer = (item: Item) => {
    setSelectedItemId(item.id)
    setActionError(null)
    setTransferForm(emptyTransfer())
    setIsTransferOpen(true)
  }

  const handleDetailOpenChange = (open: boolean) => {
    setIsDetailOpen(open)
    if (!open) {
      setSelectedItemId(null)
    }
  }

  const handleAjusteOpenChange = (open: boolean) => {
    setIsAjusteOpen(open)
    if (!open) {
      setSelectedItemId(null)
      setActionError(null)
      setAjusteForm(emptyAjuste())
    }
  }

  const handleTransferOpenChange = (open: boolean) => {
    setIsTransferOpen(open)
    if (!open) {
      setSelectedItemId(null)
      setActionError(null)
      setTransferForm(emptyTransfer())
    }
  }

  const refreshAll = async () => {
    await Promise.all([refetch(), refetchResumen()])
    if (selectedItem?.id) {
      await refetchMovimientos()
    }
  }

  const handleAjuste = async () => {
    if (!selectedItem) return

    const depositoId = Number.parseInt(ajusteForm.depositoId, 10)
    const nuevaCantidad = Number.parseFloat(ajusteForm.nuevaCantidad)

    if (Number.isNaN(depositoId) || Number.isNaN(nuevaCantidad)) {
      setActionError("Selecciona un depósito e informa una cantidad válida para el ajuste.")
      return
    }

    setActionError(null)
    const ok = await ajustar({
      itemId: selectedItem.id,
      depositoId,
      nuevaCantidad,
      observacion: ajusteForm.observacion || undefined,
    })

    if (!ok) {
      setActionError("No se pudo registrar el ajuste de stock.")
      return
    }

    await refreshAll()
    setIsAjusteOpen(false)
    setAjusteForm(emptyAjuste())
  }

  const handleTransfer = async () => {
    if (!selectedItem) return

    const depositoOrigenId = Number.parseInt(transferForm.depositoOrigenId, 10)
    const depositoDestinoId = Number.parseInt(transferForm.depositoDestinoId, 10)
    const cantidad = Number.parseFloat(transferForm.cantidad)

    if (
      Number.isNaN(depositoOrigenId) ||
      Number.isNaN(depositoDestinoId) ||
      Number.isNaN(cantidad) ||
      cantidad <= 0
    ) {
      setActionError("Completa origen, destino y cantidad válida para la transferencia.")
      return
    }

    if (depositoOrigenId === depositoDestinoId) {
      setActionError("El depósito destino debe ser distinto del depósito origen.")
      return
    }

    setActionError(null)
    const ok = await transferir({
      itemId: selectedItem.id,
      depositoOrigenId,
      depositoDestinoId,
      cantidad,
      observacion: transferForm.observacion || undefined,
    })

    if (!ok) {
      setActionError("No se pudo registrar la transferencia.")
      return
    }

    await refreshAll()
    setIsTransferOpen(false)
    setTransferForm(emptyTransfer())
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventario y stock</h1>
          <p className="text-muted-foreground mt-1">
            Consola de control de stock por sucursal con resumen real, depósitos por ítem y
            movimientos registrados en backend.
          </p>
        </div>

        <Button variant="outline" onClick={() => void refreshAll()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {(error || actionHookError || actionError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Inventario</AlertTitle>
          <AlertDescription>{actionError ?? actionHookError ?? error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Items con stock"
          value={loadingResumen ? "..." : (resumen?.totalItemsConStock ?? 0)}
          description={`Sucursal ${sucursalId ?? "-"} en monitoreo`}
          icon={<Package className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Bajo mínimo"
          value={loadingResumen ? "..." : (resumen?.itemsBajoMinimo ?? 0)}
          description="Detectados por el resumen de stock"
          icon={<ShieldAlert className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Sin stock"
          value={loadingResumen ? "..." : (resumen?.itemsSinStock ?? 0)}
          description="Sin disponibilidad operativa"
          icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Valor inventariado"
          value={formatMoney(valorInventario)}
          description={`${resumen?.totalDepositos ?? depositos.length} depósitos en circuito`}
          icon={<Warehouse className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Fichas ampliadas"
          value={itemsConDatosAmpliados}
          description="Items con codigo de barras, AFIP o descripcion extendida visibles"
          icon={<Package className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Cobertura comprometida"
          value={itemsConCoberturaComprometida}
          description="Items con stock positivo pero en umbral minimo"
          icon={<ShieldAlert className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Ultimo movimiento"
          value={ultimoMovimientoVisible ? formatDateTime(ultimoMovimientoVisible.fecha) : "-"}
          description="Referencia visible del item actualmente seleccionado"
          icon={<RefreshCw className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Ultima actualizacion"
          value={formatDateTime(ultimaActualizacionStock)}
          description="Mayor fecha visible entre los depositos del item activo"
          icon={<Warehouse className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 via-background to-orange-50">
          <CardHeader>
            <CardDescription>Radar operativo</CardDescription>
            <CardTitle className="text-xl">
              {featuredAlert
                ? `${featuredAlert.codigo} · ${featuredAlert.descripcion}`
                : "Sin alertas críticas en foco"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {featuredAlert ? (
              <>
                <p className="max-w-3xl text-sm text-muted-foreground">
                  {featuredAlert.depositoDescripcion} muestra {featuredAlert.stockActual} unidades
                  visibles contra un mínimo de {featuredAlert.stockMinimo}. La consola deja el
                  desvío operativo en primer plano sin salir de inventario.
                </p>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-amber-200 bg-white/80 p-4">
                    <p className="text-xs uppercase tracking-wide text-amber-900/70">Cobertura</p>
                    <p className="mt-2 text-sm font-semibold text-amber-950">
                      {featuredAlert.stockActual <= 0 ? "Sin stock" : "Bajo mínimo"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-white/80 p-4">
                    <p className="text-xs uppercase tracking-wide text-amber-900/70">
                      Brecha visible
                    </p>
                    <p className="mt-2 text-sm font-semibold text-amber-950">
                      {Math.max(featuredAlert.stockMinimo - featuredAlert.stockActual, 0)} unidades
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-white/80 p-4">
                    <p className="text-xs uppercase tracking-wide text-amber-900/70">
                      Depósito foco
                    </p>
                    <p className="mt-2 text-sm font-semibold text-amber-950">
                      {featuredAlert.depositoDescripcion}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-amber-200 bg-white/70 p-5 text-sm text-muted-foreground">
                No hay alertas bajo mínimo para destacar en la sucursal activa.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-sky-200 bg-gradient-to-br from-sky-50 via-background to-cyan-50">
          <CardHeader>
            <CardDescription>Item enfocado</CardDescription>
            <CardTitle className="text-xl">
              {featuredAlertItem
                ? `${featuredAlertItem.codigo} · ${featuredAlertItem.descripcion}`
                : "Selecciona un ítem para ver su lectura operativa"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {featuredAlertItem ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {getStockBadge(featuredAlertItem)}
                  <Badge variant="outline">{getCatalogStatus(featuredAlertItem)}</Badge>
                  <Badge variant="outline">{getCoverageStatus(featuredAlertItem)}</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-sky-200 bg-white/80 p-4">
                    <p className="text-xs uppercase tracking-wide text-sky-900/70">Stock actual</p>
                    <p className="mt-2 text-lg font-semibold text-sky-950">
                      {featuredAlertItem.stock ?? 0}
                    </p>
                  </div>
                  <div className="rounded-xl border border-sky-200 bg-white/80 p-4">
                    <p className="text-xs uppercase tracking-wide text-sky-900/70">
                      Rango objetivo
                    </p>
                    <p className="mt-2 text-lg font-semibold text-sky-950">
                      {featuredAlertItem.stockMinimo} / {featuredAlertItem.stockMaximo ?? "-"}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  La vista lateral usa este item como referencia para ajustes, transferencias y
                  lectura por depósito.
                </p>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-sky-200 bg-white/70 p-5 text-sm text-muted-foreground">
                La selección de ítems activa el radar lateral y refuerza la lectura visual del
                inventario operativo.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Consulta operativa</CardTitle>
          <CardDescription>
            La búsqueda usa el backend de items; categoría y estado de stock refinan el lote cargado
            sin inventar analíticas adicionales.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_240px_220px]">
          <div className="space-y-2">
            <Label>Buscar ítem</Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Código o descripción"
                value={search}
                onChange={(event) => {
                  setPage(1)
                  setSearch(event.target.value)
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Categoría</Label>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas las categorías</SelectItem>
                {categorias.map((categoria) => (
                  <SelectItem key={categoria.id} value={String(categoria.id)}>
                    {categoria.descripcion}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Estado de stock</Label>
            <Select
              value={filterStock}
              onValueChange={(value) => setFilterStock(value as typeof filterStock)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="sin-stock">Sin stock</SelectItem>
                <SelectItem value="bajo-minimo">Bajo mínimo</SelectItem>
                <SelectItem value="con-stock">Con stock suficiente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Ítems inventariados</CardTitle>
            <CardDescription>
              {filteredProducts.length} ítems en la página {page} de {totalPages || 1}. Total
              backend: {totalCount}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Ficha</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Mínimo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                      <div className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Cargando items...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                      No hay ítems para los filtros actuales.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((item) => (
                    <TableRow
                      key={item.id}
                      className={item.id === selectedItemId ? "bg-accent/40" : undefined}
                      onClick={() => setSelectedItemId(item.id)}
                    >
                      <TableCell className="font-mono text-sm font-semibold">
                        {item.codigo}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p>{item.descripcion}</p>
                          {(item.descripcionAdicional || item.codigoBarras) && (
                            <p className="text-xs text-muted-foreground">
                              {item.descripcionAdicional ?? `EAN ${item.codigoBarras}`}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="outline">
                            {item.categoriaDescripcion ?? "Sin categoría"}
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            {item.unidadMedidaDescripcion ?? "Unidad no informada"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-xs">
                            {getCatalogStatus(item)}
                          </Badge>
                          {item.codigoAfip && (
                            <p className="text-xs text-muted-foreground">AFIP {item.codigoAfip}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{item.stock ?? 0}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.stockMinimo}
                      </TableCell>
                      <TableCell>{getStockBadge(item)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(event) => {
                              event.stopPropagation()
                              openDetail(item)
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(event) => {
                              event.stopPropagation()
                              openAjuste(item)
                            }}
                          >
                            <SlidersHorizontal className="h-4 w-4 mr-2" />
                            Ajuste
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(event) => {
                              event.stopPropagation()
                              openTransfer(item)
                            }}
                          >
                            <ArrowRightLeft className="h-4 w-4 mr-2" />
                            Transferir
                          </Button>
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
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ítems bajo mínimo</CardTitle>
              <CardDescription>
                Alertas reales informadas por el resumen de stock de la sucursal activa.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingResumen ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                </div>
              ) : bajoMinimo.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay alertas de bajo mínimo.</p>
              ) : (
                bajoMinimo.slice(0, 8).map((item) => (
                  <div key={`${item.itemId}-${item.depositoId}`} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{item.codigo}</p>
                        <p className="text-xs text-muted-foreground">{item.descripcion}</p>
                      </div>
                      <Badge variant="secondary">{item.depositoDescripcion}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Stock actual {item.stockActual} / mínimo {item.stockMinimo}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalle seleccionado</CardTitle>
              <CardDescription>
                Distribución por depósito y últimos movimientos del ítem activo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedItem ? (
                <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                  Selecciona un ítem para consultar stock por depósito, movimientos y ejecutar
                  acciones.
                </div>
              ) : (
                <div className="space-y-4 text-sm">
                  <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-sky-950">
                          {selectedItem.codigo} - {selectedItem.descripcion}
                        </p>
                        <p className="text-sky-900/80">
                          {selectedItem.unidadMedidaDescripcion ?? "Unidad no informada"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {getStockBadge(selectedItem)}
                        <Badge variant="outline">{getCatalogStatus(selectedItem)}</Badge>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => openDetail(selectedItem)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver ficha
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openAjuste(selectedItem)}>
                        <SlidersHorizontal className="h-4 w-4 mr-2" />
                        Ajustar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openTransfer(selectedItem)}
                      >
                        <ArrowRightLeft className="h-4 w-4 mr-2" />
                        Transferir
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">Estado de cobertura</p>
                      <p className="mt-2 font-semibold">{getCoverageStatus(selectedItem)}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">Ficha visible</p>
                      <p className="mt-2 font-semibold">{getCatalogStatus(selectedItem)}</p>
                    </div>
                  </div>

                  <div>
                    <p className="font-semibold">
                      {selectedItem.codigo} - {selectedItem.descripcion}
                    </p>
                    <p className="text-muted-foreground">
                      {selectedItem.unidadMedidaDescripcion ?? "Unidad no informada"}
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-muted-foreground">Stock por depósito</p>
                    {loadingStock ? (
                      <div className="py-4 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : stock?.depositos && stock.depositos.length > 0 ? (
                      <div className="space-y-2">
                        {stock.depositos.map((deposito) => (
                          <div
                            key={deposito.id}
                            className="flex items-center justify-between rounded-md border px-3 py-2"
                          >
                            <div>
                              <p className="font-medium">{deposito.depositoDescripcion}</p>
                              <p className="text-xs text-muted-foreground">
                                {deposito.esDefault
                                  ? "Depósito por defecto"
                                  : `Depósito ${deposito.depositoId}`}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Actualizado {formatDateTime(deposito.updatedAt)}
                              </p>
                            </div>
                            <Badge variant="outline">{deposito.cantidad}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">
                        No hay stock distribuido para este ítem.
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Desde</Label>
                        <Input
                          type="date"
                          value={desde}
                          onChange={(event) => setDesde(event.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Hasta</Label>
                        <Input
                          type="date"
                          value={hasta}
                          onChange={(event) => setHasta(event.target.value)}
                        />
                      </div>
                    </div>
                    <Button variant="outline" onClick={() => void refetchMovimientos()}>
                      Consultar movimientos
                    </Button>
                    <div>
                      <p className="mb-2 text-muted-foreground">Últimos movimientos</p>
                      {loadingMovimientos ? (
                        <div className="py-4 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : movimientos.length > 0 ? (
                        <div className="space-y-2">
                          {movimientos.slice(0, 6).map((movimiento) => (
                            <div key={movimiento.id} className="rounded-md border px-3 py-2">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-medium">{movimiento.tipoMovimiento}</p>
                                <Badge variant="outline">{movimiento.cantidad}</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {formatDateTime(movimiento.fecha)} · Depósito{" "}
                                {movimiento.depositoId}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {getMovementScope(movimiento.tipoMovimiento)} · Saldo resultante:{" "}
                                {movimiento.saldoResultante}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {movimiento.observacion ?? "Sin observacion operativa"}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">
                          No hay movimientos para el rango indicado.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isDetailOpen && !!selectedItem} onOpenChange={handleDetailOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedItem?.codigo} - {selectedItem?.descripcion}
            </DialogTitle>
            <DialogDescription>
              Ficha operativa con datos actualmente expuestos por items y stock.
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <Tabs defaultValue="general" className="py-2">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="comercial">Comercial</TabsTrigger>
                <TabsTrigger value="circuito">Circuito</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <span className="text-sm text-muted-foreground">Categoría</span>
                  <p className="font-medium">
                    {selectedItem.categoriaDescripcion ?? "Sin categoría"}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Unidad</span>
                  <p className="font-medium">
                    {selectedItem.unidadMedidaDescripcion ?? "No informada"}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Código de barras</span>
                  <p className="font-medium">{selectedItem.codigoBarras ?? "-"}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Código AFIP</span>
                  <p className="font-medium">{selectedItem.codigoAfip ?? "-"}</p>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-sm text-muted-foreground">Descripción adicional</span>
                  <p className="font-medium">
                    {selectedItem.descripcionAdicional ?? "Sin descripción adicional."}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="comercial" className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <span className="text-sm text-muted-foreground">Precio costo</span>
                  <p className="font-medium">{formatMoney(selectedItem.precioCosto)}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Precio venta</span>
                  <p className="font-medium">{formatMoney(selectedItem.precioVenta)}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Estado de ficha</span>
                  <p className="font-medium">{getCatalogStatus(selectedItem)}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Tipo de stock</span>
                  <p className="font-medium">
                    {selectedItem.manejaStock ? "Stock gestionado" : "Sin gestion de stock"}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="circuito" className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <span className="text-sm text-muted-foreground">Stock actual</span>
                  <p className="font-medium">{selectedItem.stock ?? 0}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Cobertura</span>
                  <p className="font-medium">{getCoverageStatus(selectedItem)}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Rango objetivo</span>
                  <p className="font-medium">
                    {selectedItem.stockMinimo} / {selectedItem.stockMaximo ?? "-"}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Depositos visibles</span>
                  <p className="font-medium">{stock?.depositos?.length ?? 0}</p>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-sm text-muted-foreground">
                    Ultima actualizacion visible
                  </span>
                  <p className="font-medium">{formatDateTime(ultimaActualizacionStock)}</p>
                </div>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => handleDetailOpenChange(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAjusteOpen && !!selectedItem} onOpenChange={handleAjusteOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajuste de stock</DialogTitle>
            <DialogDescription>
              Registra la nueva cantidad del ítem seleccionado en un depósito específico.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Depósito</Label>
              <Select
                value={ajusteForm.depositoId}
                onValueChange={(value) =>
                  setAjusteForm((current) => ({ ...current, depositoId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un depósito" />
                </SelectTrigger>
                <SelectContent>
                  {depositos.map((deposito) => (
                    <SelectItem key={deposito.id} value={String(deposito.id)}>
                      {deposito.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nueva cantidad</Label>
              <Input
                type="number"
                min="0"
                value={ajusteForm.nuevaCantidad}
                onChange={(event) =>
                  setAjusteForm((current) => ({ ...current, nuevaCantidad: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Observación</Label>
              <Textarea
                rows={3}
                value={ajusteForm.observacion}
                onChange={(event) =>
                  setAjusteForm((current) => ({ ...current, observacion: event.target.value }))
                }
                placeholder="Motivo del ajuste"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleAjusteOpenChange(false)}>
              Cancelar
            </Button>
            <Button disabled={actionLoading} onClick={() => void handleAjuste()}>
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar ajuste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTransferOpen && !!selectedItem} onOpenChange={handleTransferOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Transferencia entre depósitos</DialogTitle>
            <DialogDescription>
              Mueve stock entre depósitos usando la operación soportada por backend.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Depósito origen</Label>
                <Select
                  value={transferForm.depositoOrigenId}
                  onValueChange={(value) =>
                    setTransferForm((current) => ({ ...current, depositoOrigenId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Origen" />
                  </SelectTrigger>
                  <SelectContent>
                    {depositos.map((deposito) => (
                      <SelectItem key={deposito.id} value={String(deposito.id)}>
                        {deposito.descripcion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Depósito destino</Label>
                <Select
                  value={transferForm.depositoDestinoId}
                  onValueChange={(value) =>
                    setTransferForm((current) => ({ ...current, depositoDestinoId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {depositos.map((deposito) => (
                      <SelectItem key={deposito.id} value={String(deposito.id)}>
                        {deposito.descripcion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cantidad</Label>
              <Input
                type="number"
                min="0"
                value={transferForm.cantidad}
                onChange={(event) =>
                  setTransferForm((current) => ({ ...current, cantidad: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Observación</Label>
              <Textarea
                rows={3}
                value={transferForm.observacion}
                onChange={(event) =>
                  setTransferForm((current) => ({ ...current, observacion: event.target.value }))
                }
                placeholder="Motivo o referencia operativa"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleTransferOpenChange(false)}>
              Cancelar
            </Button>
            <Button disabled={actionLoading} onClick={() => void handleTransfer()}>
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Registrar transferencia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
