"use client"

import { useMemo } from "react"
import { Activity, Boxes, ClipboardList, MapPinned, Warehouse } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Link from "next/link"
import { useConteosStock } from "@/lib/hooks/useConteosStock"
import { useDepositos } from "@/lib/hooks/useDepositos"
import { useOrdenesCompra } from "@/lib/hooks/useOrdenesCompra"
import { useRegiones } from "@/lib/hooks/useRegiones"
import { useStockResumen } from "@/lib/hooks/useStock"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"
import { useZonas } from "@/lib/hooks/useZonas"
import { isOrdenCompraRecepcionAbierta, isOrdenCompraRecepcionParcial } from "@/lib/utils"

export default function ReportesAlmacenesPage() {
  const sucursalId = useDefaultSucursalId()
  const { depositos } = useDepositos(sucursalId)
  const { ordenes } = useOrdenesCompra()
  const { bajoMinimo, resumen, loading: stockLoading } = useStockResumen(sucursalId)
  const { conteos, loading: conteosLoading } = useConteosStock()
  const { zonas, loading: zonasLoading } = useZonas("all")
  const { regiones, loading: regionesLoading } = useRegiones()

  const movementByDeposit = useMemo(() => {
    if (resumen?.movimientosPorDeposito?.length) {
      return resumen.movimientosPorDeposito.map((deposito) => ({
        deposito: deposito.descripcion,
        movimientos: deposito.movimientos,
        alertas: deposito.alertasBajoMinimo,
      }))
    }

    return depositos.map((deposito) => ({
      deposito: deposito.descripcion,
      movimientos: 0,
      alertas: bajoMinimo.filter((row) => row.depositoId === deposito.id).length,
    }))
  }, [bajoMinimo, depositos, resumen])

  const conteosByEstado = useMemo(
    () => [
      {
        estado: "Programados",
        total: conteos.filter((row) => row.estado === "programado").length,
      },
      {
        estado: "En ejecución",
        total: conteos.filter((row) => row.estado === "en-ejecucion").length,
      },
      {
        estado: "Observados",
        total: conteos.filter((row) => row.estado === "observado").length,
      },
    ],
    [conteos]
  )

  const regionesJerarquicas = useMemo(() => {
    const integradoras = regiones.filter((row) => row.esRegionIntegradora).length
    const operativas = regiones.length - integradoras
    return { integradoras, operativas }
  }, [regiones])

  const recepcionesAbiertas = useMemo(
    () => ordenes.filter(isOrdenCompraRecepcionAbierta),
    [ordenes]
  )

  const recepcionesParciales = useMemo(
    () => recepcionesAbiertas.filter(isOrdenCompraRecepcionParcial).length,
    [recepcionesAbiertas]
  )

  const loading = stockLoading || conteosLoading || zonasLoading || regionesLoading

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <Card className="border-sky-200 bg-linear-to-br from-sky-50 via-background to-cyan-50">
          <CardHeader className="space-y-4">
            <Badge variant="outline" className="w-fit border-sky-200 bg-white/80 text-sky-900">
              Consolidado WMS
            </Badge>
            <div className="space-y-2">
              <CardTitle className="text-3xl tracking-tight text-slate-950">Reportes WMS</CardTitle>
              <CardDescription className="max-w-3xl text-base leading-7 text-slate-600">
                Resumen consolidado sobre maestros reales, conteos persistidos, movimientos de stock
                y cobertura operativa actual.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-white/80 text-slate-900">
                {depositos.length} depósitos
              </Badge>
              <Badge variant="secondary" className="bg-white/80 text-slate-900">
                {recepcionesAbiertas.length} recepciones abiertas
              </Badge>
              <Badge variant="secondary" className="bg-white/80 text-slate-900">
                {bajoMinimo.length} alertas bajo mínimo
              </Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-sky-200 bg-white/80 p-4">
                <p className="text-xs uppercase tracking-wide text-sky-900/70">Cobertura</p>
                <p className="mt-2 text-sm font-semibold text-sky-950">
                  {depositos.length > 0 ? "Maestros visibles" : "Sin depósitos cargados"}
                </p>
              </div>
              <div className="rounded-xl border border-sky-200 bg-white/80 p-4">
                <p className="text-xs uppercase tracking-wide text-sky-900/70">Conteos</p>
                <p className="mt-2 text-sm font-semibold text-sky-950">
                  {conteos.length} ciclos visibles
                </p>
              </div>
              <div className="rounded-xl border border-sky-200 bg-white/80 p-4">
                <p className="text-xs uppercase tracking-wide text-sky-900/70">Movimientos</p>
                <p className="mt-2 text-sm font-semibold text-sky-950">
                  {resumen?.movimientosTotales ?? 0} registros consolidados
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-linear-to-br from-slate-50 via-background to-stone-50">
          <CardHeader>
            <CardDescription>Lectura rápida</CardDescription>
            <CardTitle className="text-xl">Señales visibles del consolidado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border bg-white/85 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Recepción operativa</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {recepcionesParciales} órdenes parciales y {recepcionesAbiertas.length}{" "}
                    abiertas.
                  </p>
                </div>
                <Activity className="h-5 w-5 text-sky-700" />
              </div>
            </div>
            <div className="rounded-xl border bg-white/85 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Cobertura maestra</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {zonas.length} zonas y {regiones.length} regiones en la lectura actual.
                  </p>
                </div>
                <MapPinned className="h-5 w-5 text-emerald-700" />
              </div>
            </div>
            <Button asChild variant="outline">
              <Link href="/almacenes">Volver al tablero</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-slate-200 bg-linear-to-br from-white via-white to-sky-50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm font-medium">Depósitos</CardTitle>
              <Warehouse className="h-4 w-4 text-slate-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{depositos.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">Cobertura real</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-linear-to-br from-white via-white to-emerald-50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm font-medium">Zonas activas</CardTitle>
              <MapPinned className="h-4 w-4 text-slate-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : zonas.filter((row) => row.activo).length}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Maestro backend</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-linear-to-br from-white via-white to-cyan-50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm font-medium">Regiones</CardTitle>
              <Boxes className="h-4 w-4 text-slate-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : regiones.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">Estructura jerárquica real</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-linear-to-br from-white via-white to-orange-50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm font-medium">Recepciones abiertas</CardTitle>
              <ClipboardList className="h-4 w-4 text-slate-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recepcionesAbiertas.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {recepcionesParciales} parciales con saldo pendiente
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Movimientos por depósito</CardTitle>
            <CardDescription>Lectura consolidada sobre stock y cobertura actual.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Depósito</TableHead>
                  <TableHead>Movimientos</TableHead>
                  <TableHead>Alertas bajo mínimo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                      Cargando consolidado operativo...
                    </TableCell>
                  </TableRow>
                ) : movementByDeposit.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                      No hay depósitos visibles para consolidar en esta consulta.
                    </TableCell>
                  </TableRow>
                ) : (
                  movementByDeposit.map((row) => (
                    <TableRow key={row.deposito}>
                      <TableCell className="font-medium">{row.deposito}</TableCell>
                      <TableCell>{row.movimientos}</TableCell>
                      <TableCell>{row.alertas}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Indicadores operativos</CardTitle>
            <CardDescription>
              KPIs consolidados con maestros reales y agenda de conteos persistida.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-lg border p-4">
              <p className="text-muted-foreground">Items con stock</p>
              <p className="mt-2 text-xl font-semibold">
                {loading ? "..." : (resumen?.totalItemsConStock ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-muted-foreground">Alertas bajo mínimo</p>
              <p className="mt-2 text-xl font-semibold">{bajoMinimo.length}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-muted-foreground">Movimientos consolidados</p>
              <p className="mt-2 text-xl font-semibold">
                {loading ? "..." : (resumen?.movimientosTotales ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-muted-foreground">Regiones integradoras</p>
              <p className="mt-2 text-xl font-semibold">
                {loading ? "..." : `${regionesJerarquicas.integradoras} / ${regiones.length}`}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Conteos por estado</CardTitle>
            <CardDescription>Seguimiento de la agenda cíclica actual.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estado</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conteosByEstado.map((row) => (
                  <TableRow key={row.estado}>
                    <TableCell className="font-medium">{row.estado}</TableCell>
                    <TableCell>{loading ? "..." : row.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cobertura de maestros</CardTitle>
            <CardDescription>Estado actual del lote de maestros de almacenes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-lg border p-4">
              <p className="text-muted-foreground">Zonas totales</p>
              <p className="mt-2 text-xl font-semibold">{loading ? "..." : zonas.length}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-muted-foreground">Regiones operativas</p>
              <p className="mt-2 text-xl font-semibold">
                {loading ? "..." : regionesJerarquicas.operativas}
              </p>
            </div>
            <div className="rounded-lg border border-dashed p-4 text-muted-foreground">
              Este tablero ya no depende de overlays del legacy para zonas, regiones o conteos. Las
              cifras salen de maestros y movimientos reales del backend actual.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
