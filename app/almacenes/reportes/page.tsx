"use client"

import { useMemo } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { legacyWarehouseRegions, legacyWarehouseZones } from "@/lib/inventario-legacy-data"
import { useDepositos } from "@/lib/hooks/useDepositos"
import { useOrdenesCompra } from "@/lib/hooks/useOrdenesCompra"
import { useStockMovimientos, useStockResumen } from "@/lib/hooks/useStock"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"

export default function ReportesAlmacenesPage() {
  const sucursalId = useDefaultSucursalId()
  const { depositos } = useDepositos(sucursalId)
  const { ordenes } = useOrdenesCompra()
  const { bajoMinimo, resumen } = useStockResumen(sucursalId)
  const { movimientos } = useStockMovimientos()

  const movementByDeposit = useMemo(() => {
    return depositos.map((deposito) => ({
      deposito: deposito.descripcion,
      movimientos: movimientos.filter((row) => row.depositoId === deposito.id).length,
      alertas: bajoMinimo.filter((row) => row.depositoId === deposito.id).length,
    }))
  }, [bajoMinimo, depositos, movimientos])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reportes WMS</h1>
        <p className="mt-1 text-muted-foreground">
          Resumen consolidado de zonas, regiones, movimientos y recepciones para cubrir el frente
          analitico visible del lote 5 sin depender de reportes backend aun no publicados.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Depositos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{depositos.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">Cobertura real</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Zonas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{legacyWarehouseZones.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">Overlay local</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Regiones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{legacyWarehouseRegions.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">Mapa funcional</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">OC pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {ordenes.filter((row) => row.estadoOc !== "RECIBIDA").length}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Recepciones abiertas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Movimientos por deposito</CardTitle>
            <CardDescription>Lectura consolidada sobre stock y cobertura actual.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deposito</TableHead>
                  <TableHead>Movimientos</TableHead>
                  <TableHead>Alertas bajo minimo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movementByDeposit.map((row) => (
                  <TableRow key={row.deposito}>
                    <TableCell className="font-medium">{row.deposito}</TableCell>
                    <TableCell>{row.movimientos}</TableCell>
                    <TableCell>{row.alertas}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Indicadores operativos</CardTitle>
            <CardDescription>
              KPIs visibles combinando datos reales y overlays del legacy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-lg border p-4">
              <p className="text-muted-foreground">Items con stock</p>
              <p className="mt-2 text-xl font-semibold">{resumen?.totalItemsConStock ?? 0}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-muted-foreground">Alertas bajo minimo</p>
              <p className="mt-2 text-xl font-semibold">{bajoMinimo.length}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-muted-foreground">Movimientos visibles</p>
              <p className="mt-2 text-xl font-semibold">{movimientos.length}</p>
            </div>
            <div className="rounded-lg border p-4 text-muted-foreground">
              Esta pagina cubre el frente de reportes del legacy con consolidacion local. Cuando el
              backend publique reportes dedicados, podra reemplazarse sin cambiar el circuito
              visible.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
