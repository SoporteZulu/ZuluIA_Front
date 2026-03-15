"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Percent, AlertCircle } from "lucide-react"
import { useDescuentosComerciales } from "@/lib/hooks/useDescuentosComerciales"

export default function DescuentosComercialesPage() {
  const { descuentos, loading, error } = useDescuentosComerciales()
  const [searchTerm, setSearchTerm] = useState("")

  const filtered = descuentos.filter((d) => {
    const term = searchTerm.toLowerCase()
    return (
      d.porcentaje.toString().includes(term) ||
      (d.terceroId?.toString() ?? "").includes(term) ||
      (d.itemId?.toString() ?? "").includes(term)
    )
  })

  const formatDate = (value?: string) =>
    value ? new Date(value).toLocaleDateString("es-AR") : "-"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Descuentos Comerciales</h1>
          <p className="text-muted-foreground">Gestión de descuentos por cliente o producto</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Descuentos</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{descuentos.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Activos</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-500">{descuentos.filter((d) => d.activo).length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Inactivos</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-gray-500">{descuentos.filter((d) => !d.activo).length}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por porcentaje, cliente o producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Porcentaje</TableHead>
                <TableHead>Cliente (Tercero)</TableHead>
                <TableHead>Producto (Item)</TableHead>
                <TableHead>Vigencia Desde</TableHead>
                <TableHead>Vigencia Hasta</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Cargando...</TableCell>
                </TableRow>
              )}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Percent className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    No hay descuentos registrados
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((descuento) => (
                <TableRow key={descuento.id}>
                  <TableCell className="font-bold text-lg">{descuento.porcentaje}%</TableCell>
                  <TableCell>{descuento.terceroId ? `#${descuento.terceroId}` : "Todos"}</TableCell>
                  <TableCell>{descuento.itemId ? `#${descuento.itemId}` : "Todos"}</TableCell>
                  <TableCell>{formatDate(descuento.desde)}</TableCell>
                  <TableCell>{formatDate(descuento.hasta)}</TableCell>
                  <TableCell>
                    <Badge variant={descuento.activo ? "default" : "secondary"}>
                      {descuento.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
