"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, GitBranch, AlertCircle } from "lucide-react"
import { useCentrosCosto } from "@/lib/hooks/useCentrosCosto"

export default function CentrosCostoPage() {
  const { centrosCosto, loading, error } = useCentrosCosto()
  const [searchTerm, setSearchTerm] = useState("")

  const filtered = centrosCosto.filter((c) =>
    c.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const parentMap = new Map(centrosCosto.map((c) => [c.id, c.descripcion]))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Centros de Costo</h1>
          <p className="text-muted-foreground">Estructura de centros de costo contables</p>
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
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{centrosCosto.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Activos</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-500">{centrosCosto.filter((c) => c.activo).length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Inactivos</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-gray-500">{centrosCosto.filter((c) => !c.activo).length}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por código o descripción..."
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
                <TableHead>Código</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Centro Padre</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Cargando...</TableCell>
                </TableRow>
              )}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    <GitBranch className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    No hay centros de costo registrados
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((centro) => (
                <TableRow key={centro.id}>
                  <TableCell className="font-mono font-medium">{centro.codigo}</TableCell>
                  <TableCell>{centro.descripcion}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {centro.padre ? (parentMap.get(centro.padre) ?? `#${centro.padre}`) : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={centro.activo ? "default" : "secondary"}>
                      {centro.activo ? "Activo" : "Inactivo"}
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
