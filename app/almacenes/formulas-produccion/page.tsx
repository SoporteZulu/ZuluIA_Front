"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, FlaskConical, AlertCircle } from "lucide-react"
import { useFormulasProduccion } from "@/lib/hooks/useFormulasProduccion"

export default function FormulasProduccionPage() {
  const { formulas, loading, error } = useFormulasProduccion()
  const [searchTerm, setSearchTerm] = useState("")

  const filtered = formulas.filter((f) =>
    (f.codigo ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fórmulas de Producción</h1>
          <p className="text-muted-foreground">Definición de fórmulas y componentes para producción</p>
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
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Fórmulas</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formulas.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Activas</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-500">{formulas.filter((f) => f.activa).length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Inactivas</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-gray-500">{formulas.filter((f) => !f.activa).length}</div></CardContent>
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
                <TableHead>Producto ID</TableHead>
                <TableHead>Cantidad Producida</TableHead>
                <TableHead>Componentes</TableHead>
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
                    <FlaskConical className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    No hay fórmulas de producción
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((formula) => (
                <TableRow key={formula.id}>
                  <TableCell className="font-mono text-sm">{formula.codigo ?? "-"}</TableCell>
                  <TableCell className="font-medium">{formula.descripcion}</TableCell>
                  <TableCell>#{formula.itemProductoId}</TableCell>
                  <TableCell>{formula.cantidadProducida}</TableCell>
                  <TableCell>{formula.componentes?.length ?? 0} componentes</TableCell>
                  <TableCell>
                    <Badge variant={formula.activa ? "default" : "secondary"}>
                      {formula.activa ? "Activa" : "Inactiva"}
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
