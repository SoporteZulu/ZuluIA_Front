"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CalendarDays, AlertCircle, Unlock, Lock } from "lucide-react"
import { usePeriodosIva } from "@/lib/hooks/usePeriodosIva"

export default function PeriodosIvaPage() {
  const { periodos, loading, error, abrir, cerrar } = usePeriodosIva()

  const formatDate = (value?: string) =>
    value ? new Date(value).toLocaleDateString("es-AR") : "-"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Períodos IVA</h1>
          <p className="text-muted-foreground">Gestión de períodos fiscales de IVA</p>
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
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Períodos</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{periodos.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Abiertos</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-500">{periodos.filter((p) => !p.cerrado).length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Cerrados</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-gray-500">{periodos.filter((p) => p.cerrado).length}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Período</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Ejercicio ID</TableHead>
                <TableHead>Sucursal ID</TableHead>
                <TableHead>Fecha Creación</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Cargando...</TableCell>
                </TableRow>
              )}
              {!loading && periodos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <CalendarDays className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    No hay períodos IVA registrados
                  </TableCell>
                </TableRow>
              )}
              {periodos.map((periodo) => (
                <TableRow key={periodo.id}>
                  <TableCell className="font-mono font-medium">{periodo.periodo}</TableCell>
                  <TableCell>{periodo.periodoDescripcion ?? "-"}</TableCell>
                  <TableCell>#{periodo.ejercicioId}</TableCell>
                  <TableCell>#{periodo.sucursalId}</TableCell>
                  <TableCell>{formatDate(periodo.createdAt)}</TableCell>
                  <TableCell>
                    <Badge variant={periodo.cerrado ? "secondary" : "default"}>
                      {periodo.cerrado ? "Cerrado" : "Abierto"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {periodo.cerrado ? (
                      <Button size="sm" variant="outline" onClick={() => abrir({ sucursalId: periodo.sucursalId, ejercicioId: periodo.ejercicioId, periodo: periodo.periodo })}>
                        <Unlock className="mr-1 h-3 w-3" />
                        Abrir
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => cerrar({ sucursalId: periodo.sucursalId, ejercicioId: periodo.ejercicioId, periodo: periodo.periodo })}>
                        <Lock className="mr-1 h-3 w-3" />
                        Cerrar
                      </Button>
                    )}
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
