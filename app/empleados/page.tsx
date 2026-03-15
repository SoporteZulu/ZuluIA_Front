"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Users, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react"
import { useEmpleados } from "@/lib/hooks/useEmpleados"

const estadoVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  activo: "default",
  inactivo: "secondary",
  suspendido: "outline",
  licencia: "outline",
}

export default function EmpleadosPage() {
  const { empleados, loading, error, page, setPage, totalPages, totalCount, search, setSearch } = useEmpleados()

  const formatDate = (value?: string) =>
    value ? new Date(value).toLocaleDateString("es-AR") : "-"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Empleados</h1>
          <p className="text-muted-foreground">Gestión de recursos humanos</p>
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
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Empleados</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Activos</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-500">{empleados.filter((e) => e.estado === "activo").length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Página</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{page} / {totalPages || 1}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, legajo o CUIT..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
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
                <TableHead>Legajo</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>CUIT</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Ingreso</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Cargando...</TableCell>
                </TableRow>
              )}
              {!loading && empleados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Users className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    No hay empleados registrados
                  </TableCell>
                </TableRow>
              )}
              {empleados.map((empleado) => (
                <TableRow key={empleado.id}>
                  <TableCell className="font-mono">{empleado.legajo ?? "-"}</TableCell>
                  <TableCell className="font-medium">{empleado.razonSocial ?? "-"}</TableCell>
                  <TableCell className="font-mono text-sm">{empleado.cuit ?? "-"}</TableCell>
                  <TableCell>{empleado.categoria ?? "-"}</TableCell>
                  <TableCell>{formatDate(empleado.fechaIngreso)}</TableCell>
                  <TableCell>
                    <Badge variant={estadoVariant[empleado.estado] ?? "secondary"}>
                      {empleado.estado}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
