"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Boxes,
  Eye,
  Package,
  RefreshCw,
  Search,
  ShieldAlert,
  ShoppingCart,
  Warehouse,
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
import { useItems } from "@/lib/hooks/useItems"
import { useStockResumen } from "@/lib/hooks/useStock"
import { useProveedores } from "@/lib/hooks/useTerceros"
import { useDefaultSucursalId, useSucursales } from "@/lib/hooks/useSucursales"
import type { Item } from "@/lib/types/items"
import type { StockBajoMinimo } from "@/lib/types/stock"

type Severity = "critica" | "urgente" | "normal"

type ReplenishmentCase = StockBajoMinimo & {
  item?: Item
  faltante: number
  sugerido: number
  costoEstimado: number
  severidad: Severity
}

const SEVERITY_CONFIG: Record<
  Severity,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  critica: { label: "Crítica", variant: "destructive" },
  urgente: { label: "Urgente", variant: "default" },
  normal: { label: "Normal", variant: "secondary" },
}

function formatMoney(value: number) {
  return value.toLocaleString("es-AR", { style: "currency", currency: "ARS" })
}

function calculateSeverity(stockActual: number, stockMinimo: number): Severity {
  if (stockActual <= 0) return "critica"
  if (stockActual <= Math.max(1, stockMinimo * 0.5)) return "urgente"
  return "normal"
}

function calculateSuggestedUnits(item: Item | undefined, stockActual: number, stockMinimo: number) {
  const faltante = Math.max(stockMinimo - stockActual, 1)
  if (item?.stockMaximo && item.stockMaximo > stockActual) {
    return Math.max(item.stockMaximo - stockActual, faltante)
  }
  return faltante
}

function getCoverageTarget(item: Item | undefined, stockActual: number, sugerido: number) {
  const target = stockActual + sugerido
  if (item?.stockMaximo && item.stockMaximo > 0) {
    return `${target} u. sobre objetivo ${item.stockMaximo}`
  }
  return `${target} u. proyectadas contra mínimo operativo`
}

function getReplenishmentStatus(row: ReplenishmentCase) {
  if (row.stockActual <= 0) return "Reposición inmediata requerida"
  if (row.faltante >= row.stockMinimo) return "Déficit completo contra mínimo"
  if (row.severidad === "urgente") return "Reposición prioritaria en curso"
  return "Reposición preventiva recomendada"
}

function getOperationalAction(row: ReplenishmentCase) {
  if (row.severidad === "critica") {
    return `Escalar compra por ${row.sugerido} unidades y consolidar proveedor cuanto antes`
  }
  if (row.severidad === "urgente") {
    return `Preparar orden por ${row.sugerido} unidades para recuperar cobertura mínima`
  }
  return `Planificar compra de ${row.sugerido} unidades en la próxima reposición`
}

function FieldGrid({ fields }: { fields: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {fields.map((field) => (
        <div key={field.label} className="rounded-lg bg-muted/40 p-3">
          <span className="mb-1 block text-xs text-muted-foreground">{field.label}</span>
          <p className="text-sm font-medium">{field.value}</p>
        </div>
      ))}
    </div>
  )
}

export default function SolicitudesCompraPage() {
  const defaultSucursalId = useDefaultSucursalId()
  const { sucursales } = useSucursales()
  const { items } = useItems()
  const { terceros: proveedores } = useProveedores()
  const [sucursalId, setSucursalId] = useState<number | undefined>(defaultSucursalId)
  const [searchTerm, setSearchTerm] = useState("")
  const [severityFilter, setSeverityFilter] = useState<"todas" | Severity>("todas")
  const [depositoFilter, setDepositoFilter] = useState<string>("todos")
  const [selectedCase, setSelectedCase] = useState<ReplenishmentCase | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const effectiveSucursalId = sucursalId ?? defaultSucursalId

  const { resumen, bajoMinimo, loading, refetch } = useStockResumen(effectiveSucursalId)

  const replenishmentCases = useMemo<ReplenishmentCase[]>(() => {
    return bajoMinimo
      .map((row) => {
        const item = items.find((current) => current.id === row.itemId)
        const faltante = Math.max(row.stockMinimo - row.stockActual, 0)
        const sugerido = calculateSuggestedUnits(item, row.stockActual, row.stockMinimo)
        return {
          ...row,
          item,
          faltante,
          sugerido,
          costoEstimado: sugerido * (item?.precioCosto ?? 0),
          severidad: calculateSeverity(row.stockActual, row.stockMinimo),
        }
      })
      .sort((left, right) => {
        const severityOrder = { critica: 0, urgente: 1, normal: 2 }
        return (
          severityOrder[left.severidad] - severityOrder[right.severidad] ||
          right.faltante - left.faltante
        )
      })
  }, [bajoMinimo, items])

  const depositos = useMemo(() => {
    const map = new Map<number, string>()
    replenishmentCases.forEach((row) => map.set(row.depositoId, row.depositoDescripcion))
    return Array.from(map.entries()).map(([id, descripcion]) => ({ id, descripcion }))
  }, [replenishmentCases])

  const filteredCases = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return replenishmentCases.filter((row) => {
      const matchesSearch =
        term === "" ||
        row.codigo.toLowerCase().includes(term) ||
        row.descripcion.toLowerCase().includes(term)
      const matchesSeverity = severityFilter === "todas" || row.severidad === severityFilter
      const matchesDeposito =
        depositoFilter === "todos" || String(row.depositoId) === depositoFilter
      return matchesSearch && matchesSeverity && matchesDeposito
    })
  }, [depositoFilter, replenishmentCases, searchTerm, severityFilter])

  const kpis = useMemo(() => {
    const criticas = replenishmentCases.filter((row) => row.severidad === "critica").length
    const urgentes = replenishmentCases.filter((row) => row.severidad === "urgente").length
    const totalSugerido = replenishmentCases.reduce((acc, row) => acc + row.sugerido, 0)
    const costoEstimado = replenishmentCases.reduce((acc, row) => acc + row.costoEstimado, 0)
    return {
      total: replenishmentCases.length,
      criticas,
      urgentes,
      sinStock: resumen?.itemsSinStock ?? 0,
      totalSugerido,
      costoEstimado,
    }
  }, [replenishmentCases, resumen])

  const concentrationByDeposito = useMemo(() => {
    const grouped = replenishmentCases.reduce<
      Record<
        number,
        {
          depositoDescripcion: string
          casos: number
          criticos: number
          costoEstimado: number
          unidades: number
        }
      >
    >((accumulator, row) => {
      if (!accumulator[row.depositoId]) {
        accumulator[row.depositoId] = {
          depositoDescripcion: row.depositoDescripcion,
          casos: 0,
          criticos: 0,
          costoEstimado: 0,
          unidades: 0,
        }
      }

      accumulator[row.depositoId].casos += 1
      accumulator[row.depositoId].costoEstimado += row.costoEstimado
      accumulator[row.depositoId].unidades += row.sugerido
      if (row.severidad === "critica") {
        accumulator[row.depositoId].criticos += 1
      }

      return accumulator
    }, {})

    return Object.entries(grouped)
      .map(([depositoId, summary]) => ({ depositoId: Number(depositoId), ...summary }))
      .sort((left, right) => {
        if (right.criticos !== left.criticos) {
          return right.criticos - left.criticos
        }
        return right.costoEstimado - left.costoEstimado
      })
  }, [replenishmentCases])

  const highlightedCase = replenishmentCases[0] ?? null
  const providerCoverage = useMemo(() => {
    const activeProviders = proveedores.filter((provider) => provider.activo)
    return {
      active: activeProviders.length,
      withEmail: activeProviders.filter((provider) => provider.email).length,
      withPhone: activeProviders.filter((provider) => provider.telefono || provider.celular).length,
    }
  }, [proveedores])

  const openDetail = (row: ReplenishmentCase) => {
    setSelectedCase(row)
    setIsDetailOpen(true)
  }

  const selectedSucursalName =
    sucursales.find((row) => row.id === effectiveSucursalId)?.descripcion ?? "-"

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Solicitudes de Compra</h1>
          <p className="text-muted-foreground">
            Panel operativo de reabastecimiento real basado en stock bajo mínimo por sucursal.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="bg-transparent" asChild>
            <Link href="/inventario/productos">
              <Package className="mr-2 h-4 w-4" />
              Ver productos
            </Link>
          </Button>
          <Button asChild>
            <Link href="/compras/ordenes">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Ir a órdenes
            </Link>
          </Button>
        </div>
      </div>

      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          El backend actual no expone un endpoint para registrar, aprobar o rechazar solicitudes de
          compra. Esta vista reemplaza la maqueta anterior por casos reales detectados desde stock y
          deja explícito el límite funcional actual.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Casos detectados</p>
            <p className="mt-2 text-2xl font-bold">{kpis.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Críticos</p>
            <p className="mt-2 text-2xl font-bold text-destructive">{kpis.criticas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Sin stock</p>
            <p className="mt-2 text-2xl font-bold text-amber-600">{kpis.sinStock}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Costo estimado</p>
            <p className="mt-2 text-2xl font-bold">{formatMoney(kpis.costoEstimado)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contexto operativo</CardTitle>
          <CardDescription>
            Seleccione la sucursal y filtre los ítems que requieren reabastecimiento inmediato.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-[220px_1fr_220px_220px_auto]">
            <Select
              value={effectiveSucursalId ? String(effectiveSucursalId) : ""}
              onValueChange={(value) => setSucursalId(Number(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sucursal" />
              </SelectTrigger>
              <SelectContent>
                {sucursales.map((row) => (
                  <SelectItem key={row.id} value={String(row.id)}>
                    {row.descripcion}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Buscar por código o descripción..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <Select
              value={severityFilter}
              onValueChange={(value) => setSeverityFilter(value as "todas" | Severity)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Severidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="critica">Crítica</SelectItem>
                <SelectItem value="urgente">Urgente</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
              </SelectContent>
            </Select>
            <Select value={depositoFilter} onValueChange={setDepositoFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Depósito" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {depositos.map((row) => (
                  <SelectItem key={row.id} value={String(row.id)}>
                    {row.descripcion}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" className="bg-transparent" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Recargar
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Warehouse className="h-4 w-4" />
              Sucursal activa
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {selectedSucursalName}.{" "}
            {resumen
              ? `${resumen.itemsBajoMinimo} ítems bajo mínimo y ${resumen.itemsSinStock} sin stock.`
              : "Sin resumen disponible aún."}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Boxes className="h-4 w-4" />
              Cobertura
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {proveedores.length} proveedores activos disponibles y {kpis.totalSugerido} unidades
            sugeridas para recomponer cobertura en la sucursal seleccionada.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4" />
              Acción recomendada
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {kpis.criticas} casos críticos y {kpis.urgentes} urgentes requieren priorización.
            Consolide por proveedor y avance a una orden real cuando el abastecimiento quede
            confirmado.
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Radar de abastecimiento</CardTitle>
            <CardDescription>
              Concentración del faltante por depósito y cobertura operativa visible para compras.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Proveedores activos
                </p>
                <p className="mt-1 text-2xl font-semibold">{providerCoverage.active}</p>
                <p className="text-xs text-muted-foreground">
                  {providerCoverage.withEmail} con email y {providerCoverage.withPhone} con teléfono
                  visible.
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Depósitos afectados
                </p>
                <p className="mt-1 text-2xl font-semibold">{concentrationByDeposito.length}</p>
                <p className="text-xs text-muted-foreground">
                  {concentrationByDeposito[0]?.depositoDescripcion ?? "Sin concentración visible"}{" "}
                  lidera el faltante.
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Unidades sugeridas
                </p>
                <p className="mt-1 text-2xl font-semibold">{kpis.totalSugerido}</p>
                <p className="text-xs text-muted-foreground">
                  Total de unidades propuestas para recomponer cobertura.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {concentrationByDeposito.slice(0, 4).map((deposito) => (
                <div key={deposito.depositoId} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{deposito.depositoDescripcion}</p>
                      <p className="text-xs text-muted-foreground">
                        {deposito.casos} casos · {deposito.unidades} unidades sugeridas
                      </p>
                    </div>
                    <Badge variant={deposito.criticos > 0 ? "destructive" : "outline"}>
                      {deposito.criticos > 0 ? `${deposito.criticos} críticos` : "Sin críticos"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Costo estimado acumulado: {formatMoney(deposito.costoEstimado)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Caso destacado</CardTitle>
            <CardDescription>
              Prioriza el faltante más expuesto antes de consolidar la orden real.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {highlightedCase ? (
              <div className="space-y-4 rounded-xl border border-rose-200 bg-rose-50/70 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-rose-900">Reposición prioritaria</p>
                    <h3 className="mt-1 text-lg font-semibold text-rose-950">
                      {highlightedCase.descripcion}
                    </h3>
                    <p className="text-sm text-rose-900/80">
                      {highlightedCase.codigo} · {highlightedCase.depositoDescripcion}
                    </p>
                  </div>
                  <Badge variant={SEVERITY_CONFIG[highlightedCase.severidad].variant}>
                    {SEVERITY_CONFIG[highlightedCase.severidad].label}
                  </Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-rose-200 bg-white/70 p-3">
                    <p className="text-xs uppercase tracking-wide text-rose-900/70">Faltante</p>
                    <p className="mt-1 text-sm font-medium text-rose-950">
                      {highlightedCase.faltante} u. contra mínimo {highlightedCase.stockMinimo}
                    </p>
                  </div>
                  <div className="rounded-lg border border-rose-200 bg-white/70 p-3">
                    <p className="text-xs uppercase tracking-wide text-rose-900/70">
                      Compra sugerida
                    </p>
                    <p className="mt-1 text-sm font-medium text-rose-950">
                      {highlightedCase.sugerido} u. · {formatMoney(highlightedCase.costoEstimado)}
                    </p>
                  </div>
                </div>

                <p className="text-sm leading-6 text-rose-950/85">
                  {getOperationalAction(highlightedCase)}.
                </p>

                <Button variant="outline" onClick={() => openDetail(highlightedCase)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Ver detalle
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay casos detectados para destacar en la sucursal seleccionada.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Casos de reabastecimiento ({filteredCases.length})</CardTitle>
          <CardDescription>
            La tabla muestra faltantes reales tomados desde stock bajo mínimo. No se simulan
            aprobaciones ni persistencia local.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Depósito</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Mínimo</TableHead>
                <TableHead className="text-right">Faltante</TableHead>
                <TableHead className="text-right">Sugerido</TableHead>
                <TableHead>Severidad</TableHead>
                <TableHead className="text-right">Costo est.</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                    <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    Cargando análisis de stock...
                  </TableCell>
                </TableRow>
              ) : filteredCases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                    No hay faltantes para los filtros actuales.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCases.map((row) => (
                  <TableRow
                    key={`${row.itemId}-${row.depositoId}`}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => openDetail(row)}
                  >
                    <TableCell className="font-mono font-semibold">{row.codigo}</TableCell>
                    <TableCell>{row.descripcion}</TableCell>
                    <TableCell>{row.depositoDescripcion}</TableCell>
                    <TableCell className="text-right">{row.stockActual}</TableCell>
                    <TableCell className="text-right">{row.stockMinimo}</TableCell>
                    <TableCell className="text-right font-semibold text-destructive">
                      {row.faltante}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-amber-600">
                      {row.sugerido}
                    </TableCell>
                    <TableCell>
                      <Badge variant={SEVERITY_CONFIG[row.severidad].variant}>
                        {SEVERITY_CONFIG[row.severidad].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatMoney(row.costoEstimado)}</TableCell>
                    <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={() => openDetail(row)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {selectedCase?.descripcion ?? "Detalle de abastecimiento"}
            </DialogTitle>
            <DialogDescription>
              {selectedCase ? `${selectedCase.codigo} · ${selectedCase.depositoDescripcion}` : ""}
            </DialogDescription>
          </DialogHeader>

          {selectedCase ? (
            <Tabs defaultValue="principal" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="principal">Principal</TabsTrigger>
                <TabsTrigger value="abastecimiento">Abastecimiento</TabsTrigger>
                <TabsTrigger value="legado">Legado</TabsTrigger>
              </TabsList>

              <TabsContent value="principal" className="space-y-4">
                <FieldGrid
                  fields={[
                    { label: "Sucursal", value: selectedSucursalName },
                    { label: "Depósito", value: selectedCase.depositoDescripcion },
                    { label: "Código", value: selectedCase.codigo },
                    { label: "Producto", value: selectedCase.descripcion },
                    { label: "Stock actual", value: String(selectedCase.stockActual) },
                    { label: "Stock mínimo", value: String(selectedCase.stockMinimo) },
                    { label: "Faltante", value: String(selectedCase.faltante) },
                    { label: "Severidad", value: SEVERITY_CONFIG[selectedCase.severidad].label },
                  ]}
                />
              </TabsContent>

              <TabsContent value="abastecimiento" className="space-y-4">
                <FieldGrid
                  fields={[
                    { label: "Estado de reposición", value: getReplenishmentStatus(selectedCase) },
                    { label: "Compra sugerida", value: `${selectedCase.sugerido} unidades` },
                    {
                      label: "Cobertura objetivo",
                      value: getCoverageTarget(
                        selectedCase.item,
                        selectedCase.stockActual,
                        selectedCase.sugerido
                      ),
                    },
                    { label: "Costo estimado", value: formatMoney(selectedCase.costoEstimado) },
                    {
                      label: "Precio costo",
                      value: formatMoney(selectedCase.item?.precioCosto ?? 0),
                    },
                    {
                      label: "Stock máximo",
                      value: selectedCase.item?.stockMaximo
                        ? String(selectedCase.item.stockMaximo)
                        : "No definido",
                    },
                    {
                      label: "Categoría",
                      value: selectedCase.item?.categoriaDescripcion ?? "No informada",
                    },
                    {
                      label: "Unidad",
                      value: selectedCase.item?.unidadMedidaDescripcion ?? "No informada",
                    },
                    { label: "Maneja stock", value: selectedCase.item?.manejaStock ? "Sí" : "No" },
                    { label: "Proveedor preferido", value: "No disponible en backend actual" },
                  ]}
                />

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Acción operativa sugerida</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {getOperationalAction(selectedCase)}. El circuito actual permite detectar el
                    caso, dimensionar la compra y continuar manualmente hacia una orden real.
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="legado" className="space-y-4">
                <Card>
                  <CardContent className="pt-6 text-sm text-muted-foreground">
                    La pantalla ya deja visible severidad, faltante, costo y cobertura objetivo.
                    Alta manual de solicitud, aprobación por responsable, consolidación automática
                    por proveedor y conversión directa a orden quedan reservadas para cuando exista
                    ese backend.
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <p className="py-8 text-center text-muted-foreground">
              No se pudo cargar el caso seleccionado.
            </p>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              Esta vista no persiste solicitudes; prepara el abastecimiento real.
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="bg-transparent"
                onClick={() => setIsDetailOpen(false)}
              >
                Cerrar
              </Button>
              <Button asChild>
                <Link href="/compras/ordenes">
                  Continuar a órdenes
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
