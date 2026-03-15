"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Vault, AlertCircle } from "lucide-react"
import { useCajas } from "@/lib/hooks/useCajas"

export default function CajasPage() {
  const { cajas, loading, error } = useCajas()
  const [searchTerm, setSearchTerm] = useState("")

  const filtered = cajas.filter((c) =>
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.tipoCajaDescripcion ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatCurrency = (value?: number) =>
    value !== undefined ? value.toLocaleString("es-AR", { style: "currency", currency: "ARS" }) : "-"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cajas</h1>
          <p className="text-muted-foreground">Gestión de cajas y fondos por sucursal</p>
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
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Cajas</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{cajas.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Activas</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-500">{cajas.filter((c) => c.activa).length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Inactivas</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-gray-500">{cajas.filter((c) => !c.activa).length}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o tipo..."
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
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Saldo Actual</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Cargando...</TableCell>
                </TableRow>
              )}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    <Vault className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    No hay cajas registradas
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((caja) => (
                <TableRow key={caja.id}>
                  <TableCell className="font-medium">{caja.nombre}</TableCell>
                  <TableCell>{caja.tipoCajaDescripcion ?? "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{caja.descripcion ?? "-"}</TableCell>
                  <TableCell className="font-mono">{formatCurrency(caja.saldoActual)}</TableCell>
                  <TableCell>
                    <Badge variant={caja.activa ? "default" : "secondary"}>
                      {caja.activa ? "Activa" : "Inactiva"}
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
