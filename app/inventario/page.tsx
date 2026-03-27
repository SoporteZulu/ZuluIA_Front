"use client"

import { useMemo } from "react"
import Link from "next/link"
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Boxes,
  FolderTree,
  Layers3,
  Ruler,
  Tags,
  Warehouse,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useDepositos } from "@/lib/hooks/useDepositos"
import { useItems, useItemsConfig } from "@/lib/hooks/useItems"
import { useStockMovimientos, useStockResumen } from "@/lib/hooks/useStock"
import { useDefaultSucursalId, useSucursales } from "@/lib/hooks/useSucursales"

function formatDate(value?: string | Date | null) {
  if (!value) return "Sin fecha"
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value))
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

function getMovementBadge(tipoMovimiento: string) {
  const normalized = tipoMovimiento.toLowerCase()

  if (
    normalized.includes("entrada") ||
    normalized === "compra" ||
    normalized.includes("ajuste_positivo")
  ) {
    return (
      <Badge variant="secondary" className="bg-green-500/10 text-green-700">
        <ArrowDownLeft className="mr-1 h-3 w-3" />
        Entrada
      </Badge>
    )
  }

  if (
    normalized.includes("salida") ||
    normalized === "venta" ||
    normalized.includes("ajuste_negativo")
  ) {
    return (
      <Badge variant="secondary" className="bg-red-500/10 text-red-700">
        <ArrowUpRight className="mr-1 h-3 w-3" />
        Salida
      </Badge>
    )
  }

  if (normalized.includes("transfer")) {
    return (
      <Badge variant="secondary" className="bg-blue-500/10 text-blue-700">
        <ArrowLeftRight className="mr-1 h-3 w-3" />
        Transferencia
      </Badge>
    )
  }

  return <Badge variant="outline">{tipoMovimiento}</Badge>
}

export default function InventarioPage() {
  const sucursalId = useDefaultSucursalId()
  const { sucursales } = useSucursales()
  const { items, loading: itemsLoading, error: itemsError } = useItems()
  const { categorias, loading: configLoading } = useItemsConfig()
  const { depositos, loading: depositosLoading, error: depositosError } = useDepositos(sucursalId)
  const { resumen, bajoMinimo, loading: resumenLoading } = useStockResumen(sucursalId)
  const {
    movimientos,
    loading: movimientosLoading,
    error: movimientosError,
  } = useStockMovimientos()

  const activeSucursal = sucursales.find((sucursal) => sucursal.id === sucursalId)

  const itemsSinCategoria = items.filter((item) => !item.categoriaId).length
  const itemsManejanStock = items.filter((item) => item.manejaStock).length
  const depositosActivos = depositos.filter((deposito) => deposito.activo)

  const categoryUsage = useMemo(() => {
    const usage = new Map<number, number>()
    items.forEach((item) => {
      if (!item.categoriaId) {
        return
      }

      usage.set(item.categoriaId, (usage.get(item.categoriaId) ?? 0) + 1)
    })
    return usage
  }, [items])

  const topCategorias = useMemo(
    () =>
      categorias
        .map((categoria) => ({
          ...categoria,
          itemsActivos: categoryUsage.get(categoria.id) ?? 0,
        }))
        .sort((left, right) => right.itemsActivos - left.itemsActivos)
        .slice(0, 5),
    [categorias, categoryUsage]
  )

  const recentMovimientos = movimientos.slice(0, 6)

  const depositCoverage = useMemo(
    () =>
      depositos
        .map((deposito) => ({
          id: deposito.id,
          descripcion: deposito.descripcion,
          esDefault: deposito.esDefault,
          activo: deposito.activo,
          movimientos: movimientos.filter((movimiento) => movimiento.depositoId === deposito.id)
            .length,
          alertas: bajoMinimo.filter((item) => item.depositoId === deposito.id).length,
        }))
        .sort((left, right) => right.movimientos - left.movimientos || right.alertas - left.alertas)
        .slice(0, 6),
    [bajoMinimo, depositos, movimientos]
  )

  const catalogRisks = useMemo(
    () =>
      items
        .filter((item) => !item.categoriaId || !item.manejaStock)
        .map((item) => ({
          id: item.id,
          codigo: item.codigo,
          descripcion: item.descripcion,
          categoria: item.categoriaDescripcion ?? "Sin categoria",
          stock: item.manejaStock ? "Controlado" : "Sin control de stock",
          circuito: !item.categoriaId ? "Clasificacion pendiente" : "Revision operativa",
        }))
        .slice(0, 6),
    [items]
  )

  const movementStats = {
    entradas: movimientos.filter((movimiento) => movimiento.cantidad > 0).length,
    salidas: movimientos.filter((movimiento) => movimiento.cantidad < 0).length,
    transferencias: movimientos.filter((movimiento) =>
      movimiento.tipoMovimiento.toLowerCase().includes("transfer")
    ).length,
  }

  const itemLabelMap = useMemo(
    () => new Map(items.map((item) => [item.id, `${item.codigo} - ${item.descripcion}`])),
    [items]
  )
  const depositoLabelMap = useMemo(
    () => new Map(depositos.map((deposito) => [deposito.id, deposito.descripcion])),
    [depositos]
  )

  const sections = [
    {
      title: "Productos",
      description: "Catálogo, precios, stock mínimo y datos comerciales del inventario.",
      icon: Boxes,
      href: "/inventario/productos",
      stats: `${items.length} registros, ${itemsManejanStock} con control de stock`,
    },
    {
      title: "Almacenes",
      description: "Depósitos operativos, defaults por sucursal y estructura física del stock.",
      icon: Warehouse,
      href: "/inventario/almacenes",
      stats: `${depositosActivos.length} activos de ${depositos.length} depósitos cargados`,
    },
    {
      title: "Categorías",
      description: "Clasificación activa del catálogo y detección de rubros sin uso real.",
      icon: Tags,
      href: "/inventario/categorias",
      stats: `${categorias.length} categorías, ${itemsSinCategoria} ítems sin categoría`,
    },
    {
      title: "Movimientos",
      description: "Libro operativo de entradas, salidas y transferencias del stock.",
      icon: ArrowLeftRight,
      href: "/inventario/movimientos",
      stats: `${movementStats.entradas} entradas, ${movementStats.salidas} salidas, ${movementStats.transferencias} transferencias`,
    },
    {
      title: "Marcas",
      description:
        "Maestro visible de marcas y lineas comerciales mientras no exista endpoint dedicado.",
      icon: Layers3,
      href: "/inventario/marcas",
      stats: "Cobertura local de marcas legacy para completar la ficha comercial",
    },
    {
      title: "Unidades",
      description: "Unidades de medida con uso real del catalogo y overlay operativo.",
      icon: Ruler,
      href: "/inventario/unidades",
      stats: `${items.filter((item) => item.unidadMedidaId).length} items ya usan una unidad publicada`,
    },
    {
      title: "Atributos",
      description: "Bloques de validacion y atributos heredados para catalogo, logistica y fiscal.",
      icon: FolderTree,
      href: "/inventario/atributos",
      stats: "Paridad visible del maestro extendido sin inventar backend dinamico",
    },
  ]

  const pageLoading =
    itemsLoading || configLoading || depositosLoading || resumenLoading || movimientosLoading
  const pageError = itemsError ?? depositosError ?? movimientosError

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventario</h1>
        <p className="mt-1 text-muted-foreground">
          Consola operativa de catálogo, depósitos y movimientos. La portada ya resume el estado
          real de stock para la sucursal activa en lugar de limitarse a accesos rápidos.
        </p>
      </div>

      {pageError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Inventario</AlertTitle>
          <AlertDescription>{pageError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Sucursal operativa"
          value={activeSucursal?.descripcion ?? "Sin contexto"}
          description="Se usa para resumir depósitos y stock bajo mínimo"
          icon={<Layers3 className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Items con stock"
          value={resumen?.totalItemsConStock ?? 0}
          description="Productos con existencia en la sucursal activa"
          icon={<Boxes className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Bajo mínimo"
          value={resumen?.itemsBajoMinimo ?? 0}
          description="Items con reposición sugerida según stock mínimo"
          icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Depósitos activos"
          value={depositosActivos.length}
          description={`Total backend visible: ${resumen?.totalDepositos ?? depositos.length}`}
          icon={<Warehouse className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Items sin stock"
          value={resumen?.itemsSinStock ?? 0}
          description="Catalogo sin existencia para la sucursal activa"
          icon={<FolderTree className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Sin categoría"
          value={itemsSinCategoria}
          description="Items pendientes de clasificacion comercial"
          icon={<Tags className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Movimientos visibles"
          value={movimientos.length}
          description="Libro operativo cargado en esta portada"
          icon={<ArrowLeftRight className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <Link key={section.title} href={section.href}>
              <Card className="h-full cursor-pointer transition-colors hover:bg-accent/50">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{section.title}</CardTitle>
                  </div>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium text-muted-foreground">{section.stats}</p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Alertas de reposición</CardTitle>
            <CardDescription>
              Items bajo mínimo según el resumen de stock de la sucursal activa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pageLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Cargando alertas operativas...
              </p>
            ) : bajoMinimo.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No hay alertas de bajo mínimo para la sucursal activa.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ítem</TableHead>
                    <TableHead>Depósito</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Mínimo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bajoMinimo.slice(0, 6).map((item) => (
                    <TableRow key={`${item.itemId}-${item.depositoId}`}>
                      <TableCell>
                        <p className="font-medium">{item.descripcion}</p>
                        <p className="font-mono text-xs text-muted-foreground">{item.codigo}</p>
                      </TableCell>
                      <TableCell>{item.depositoDescripcion}</TableCell>
                      <TableCell className="text-right text-red-600">{item.stockActual}</TableCell>
                      <TableCell className="text-right">{item.stockMinimo}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Uso de categorías</CardTitle>
            <CardDescription>
              Distribución del catálogo activo sobre las categorías visibles del backend.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pageLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Cargando categorías...
              </p>
            ) : topCategorias.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No hay categorías cargadas para resumir.
              </p>
            ) : (
              topCategorias.map((categoria) => (
                <div
                  key={categoria.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{categoria.descripcion}</p>
                    <p className="font-mono text-xs text-muted-foreground">{categoria.codigo}</p>
                  </div>
                  {categoria.itemsActivos > 0 ? (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-700">
                      {categoria.itemsActivos} ítems
                    </Badge>
                  ) : (
                    <Badge variant="outline">Sin uso activo</Badge>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimos movimientos</CardTitle>
          <CardDescription>
            Muestra el lote más reciente cargado por el libro de movimientos; ajustes y
            transferencias se siguen registrando desde la vista específica.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pageLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Cargando movimientos recientes...
            </p>
          ) : recentMovimientos.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay movimientos disponibles para mostrar.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Ítem</TableHead>
                  <TableHead>Depósito</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentMovimientos.map((movimiento) => (
                  <TableRow key={movimiento.id}>
                    <TableCell>{new Date(movimiento.fecha).toLocaleDateString("es-AR")}</TableCell>
                    <TableCell>
                      {itemLabelMap.get(movimiento.itemId) ?? `Ítem #${movimiento.itemId}`}
                    </TableCell>
                    <TableCell>
                      {depositoLabelMap.get(movimiento.depositoId) ??
                        `Depósito #${movimiento.depositoId}`}
                    </TableCell>
                    <TableCell>{getMovementBadge(movimiento.tipoMovimiento)}</TableCell>
                    <TableCell className="text-right">{movimiento.cantidad}</TableCell>
                    <TableCell className="text-right">{movimiento.saldoResultante}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Cobertura por depósito</CardTitle>
            <CardDescription>
              Actividad reciente, alertas y rol operativo de cada deposito visible.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Depósito</TableHead>
                  <TableHead className="text-right">Movimientos</TableHead>
                  <TableHead className="text-right">Alertas</TableHead>
                  <TableHead>Circuito</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {depositCoverage.map((deposito) => (
                  <TableRow key={deposito.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{deposito.descripcion}</div>
                        <div className="text-xs text-muted-foreground">
                          {deposito.esDefault ? "Depósito default" : "Depósito auxiliar"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{deposito.movimientos}</TableCell>
                    <TableCell className="text-right">{deposito.alertas}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          !deposito.activo
                            ? "destructive"
                            : deposito.alertas > 0
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {!deposito.activo
                          ? "Inactivo"
                          : deposito.alertas > 0
                            ? "Requiere revision"
                            : "Controlado"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {depositCoverage.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-4 text-center text-muted-foreground">
                      Sin depósitos para resumir.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Riesgos de catálogo</CardTitle>
            <CardDescription>
              Ítems sin clasificación o fuera del circuito esperado de control de stock.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ítem</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Control</TableHead>
                  <TableHead>Circuito</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {catalogRisks.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{item.descripcion}</div>
                        <div className="font-mono text-xs text-muted-foreground">{item.codigo}</div>
                      </div>
                    </TableCell>
                    <TableCell>{item.categoria}</TableCell>
                    <TableCell>{item.stock}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.circuito === "Clasificacion pendiente" ? "destructive" : "outline"
                        }
                      >
                        {item.circuito}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {catalogRisks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-4 text-center text-muted-foreground">
                      No se detectaron riesgos de catálogo con los datos visibles.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {recentMovimientos.length > 0 && (
              <p className="mt-4 text-xs text-muted-foreground">
                Ultimo movimiento cargado: {formatDate(recentMovimientos[0]?.fecha)}.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
