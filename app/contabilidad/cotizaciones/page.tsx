"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, DollarSign, AlertCircle } from "lucide-react"
import { useCotizaciones } from "@/lib/hooks/useCotizaciones"

export default function CotizacionesPage() {
  const { cotizaciones, loading, error } = useCotizaciones()
  const [searchTerm, setSearchTerm] = useState("")

  const filtered = cotizaciones.filter((c) =>
    (c.monedaDescripcion ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.monedaCodigo ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("es-AR")

  const monedas = Array.from(new Set(cotizaciones.map((c) => c.monedaId))).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cotizaciones</h1>
          <p className="text-muted-foreground">Historial de cotizaciones de monedas</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Registros</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{cotizaciones.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Monedas</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-500">{monedas}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por moneda..."
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
                <TableHead>Moneda</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cotización</TableHead>
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
                    <DollarSign className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    No hay cotizaciones registradas
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((cotizacion) => (
                <TableRow key={cotizacion.id}>
                  <TableCell className="font-mono font-medium">{cotizacion.monedaCodigo ?? "-"}</TableCell>
                  <TableCell>{cotizacion.monedaDescripcion ?? "-"}</TableCell>
                  <TableCell>{formatDate(cotizacion.fecha)}</TableCell>
                  <TableCell className="font-mono">{cotizacion.cotizacion.toFixed(4)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
