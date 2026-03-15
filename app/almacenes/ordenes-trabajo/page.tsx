"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Wrench, AlertCircle } from "lucide-react"
import { useOrdenesTrabajo } from "@/lib/hooks/useOrdenesTrabajo"

const estadoVariant = (estado: string) => {
  switch (estado) {
    case "PENDIENTE": return "secondary" as const
    case "EN_PROCESO": return "default" as const
    case "COMPLETADO": return "default" as const
    case "CANCELADO": return "destructive" as const
    default: return "outline" as const
  }
}

export default function OrdenesTrabajPage() {
  const { ordenes, loading, error } = useOrdenesTrabajo()
  const [searchTerm, setSearchTerm] = useState("")

  const filtered = ordenes.filter((o) =>
    String(o.id).includes(searchTerm) ||
    (o.estado ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.observacion ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  const pendientes = ordenes.filter((o) => o.estado === "PENDIENTE").length
  const enProceso = ordenes.filter((o) => o.estado === "EN_PROCESO").length
  const completados = ordenes.filter((o) => o.estado === "COMPLETADO").length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Órdenes de Trabajo</h1>
          <p className="text-muted-foreground">Gestión de órdenes de producción y trabajo</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{ordenes.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Pendientes</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-yellow-500">{pendientes}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">En Proceso</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-500">{enProceso}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Completados</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-500">{completados}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por ID, estado u observación..."
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
                <TableHead>ID</TableHead>
                <TableHead>Fórmula</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Fin Previsto</TableHead>
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
                    <Wrench className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    No hay órdenes de trabajo
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((orden) => (
                <TableRow key={orden.id}>
                  <TableCell className="font-mono text-sm">#{orden.id}</TableCell>
                  <TableCell>#{orden.formulaId}</TableCell>
                  <TableCell>{orden.cantidad}</TableCell>
                  <TableCell>{orden.fecha ?? "-"}</TableCell>
                  <TableCell>{orden.fechaFinPrevista ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={estadoVariant(orden.estado ?? "")}>
                      {orden.estado ?? "-"}
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
