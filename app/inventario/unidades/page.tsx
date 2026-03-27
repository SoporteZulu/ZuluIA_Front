"use client"

import { useMemo, useState } from "react"
import { Ruler, Search } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useItems, useItemsConfig } from "@/lib/hooks/useItems"

function getUnitOverlay(code: string) {
  const normalized = code.toLowerCase()
  if (normalized.includes("kg") || normalized.includes("gr")) {
    return { precision: "3 decimales", stockRule: "Control por peso", fraccion: "Fraccionable" }
  }
  if (normalized.includes("lt") || normalized.includes("ml")) {
    return { precision: "2 decimales", stockRule: "Control por volumen", fraccion: "Fraccionable" }
  }
  return { precision: "0 decimales", stockRule: "Control unitario", fraccion: "No fraccionable" }
}

export default function UnidadesInventarioPage() {
  const { items } = useItems()
  const { unidades } = useItemsConfig()
  const [search, setSearch] = useState("")

  const rows = useMemo(() => {
    const usageMap = new Map<number, number>()
    items.forEach((item) => {
      usageMap.set(item.unidadMedidaId, (usageMap.get(item.unidadMedidaId) ?? 0) + 1)
    })

    const term = search.trim().toLowerCase()

    return unidades
      .map((unit) => ({
        ...unit,
        usage: usageMap.get(unit.id) ?? 0,
        ...getUnitOverlay(unit.codigo),
      }))
      .filter(
        (unit) =>
          !term ||
          unit.descripcion.toLowerCase().includes(term) ||
          unit.codigo.toLowerCase().includes(term)
      )
      .sort(
        (left, right) =>
          right.usage - left.usage || left.descripcion.localeCompare(right.descripcion)
      )
  }, [items, search, unidades])

  const highlighted = rows[0]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Unidades</h1>
        <p className="mt-1 text-muted-foreground">
          Maestro de unidades ya conectado a configuracion real, con lectura operativa ampliada para
          el circuito de inventario, formulas y picking.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unidades activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rows.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Items cubiertos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rows.reduce((sum, row) => sum + row.usage, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Con uso real</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rows.filter((row) => row.usage > 0).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sin uso visible</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {rows.filter((row) => row.usage === 0).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Catalogo de unidades</CardTitle>
            <CardDescription>Uso real combinado con overlay operativo del legacy.</CardDescription>
            <div className="relative mt-2 max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar unidad por codigo o descripcion..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unidad</TableHead>
                  <TableHead>Codigo</TableHead>
                  <TableHead>Uso real</TableHead>
                  <TableHead>Precision</TableHead>
                  <TableHead>Regla</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((unit) => (
                  <TableRow key={unit.id}>
                    <TableCell className="font-medium">{unit.descripcion}</TableCell>
                    <TableCell>{unit.codigo}</TableCell>
                    <TableCell>{unit.usage}</TableCell>
                    <TableCell>{unit.precision}</TableCell>
                    <TableCell>{unit.stockRule}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Unidad destacada</CardTitle>
              <CardDescription>La mas utilizada dentro del lote actual.</CardDescription>
            </CardHeader>
            <CardContent>
              {highlighted ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{highlighted.descripcion}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{highlighted.codigo}</p>
                    </div>
                    <Badge variant="outline">{highlighted.fraccion}</Badge>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">Items</p>
                      <p className="mt-2 font-medium">{highlighted.usage}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">Precision</p>
                      <p className="mt-2 font-medium">{highlighted.precision}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No hay unidades visibles.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Ruler className="h-4 w-4" /> Reglas visibles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Las unidades reales vienen de configuracion y mantienen compatibilidad con items.
              </p>
              <p>
                El overlay agrega precision, fraccionamiento y criterio logistico sin cambiar
                contratos.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
