"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Truck, AlertCircle } from "lucide-react"
import { useTransportistas } from "@/lib/hooks/useTransportistas"

export default function TransportistasPage() {
  const { transportistas, loading, error } = useTransportistas()
  const [searchTerm, setSearchTerm] = useState("")

  const filtered = transportistas.filter((t) =>
    (t.terceroRazonSocial ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.patente ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.terceroCuit ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transportistas</h1>
          <p className="text-muted-foreground">Gestión de transportistas y vehículos</p>
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
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Transportistas</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{transportistas.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Activos</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-500">{transportistas.filter((t) => t.activo).length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Inactivos</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-gray-500">{transportistas.filter((t) => !t.activo).length}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, CUIT o patente..."
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
                <TableHead>Razón Social</TableHead>
                <TableHead>CUIT</TableHead>
                <TableHead>CUIT Transportista</TableHead>
                <TableHead>Patente</TableHead>
                <TableHead>Marca Vehículo</TableHead>
                <TableHead>Domicilio Partida</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Cargando...</TableCell>
                </TableRow>
              )}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <Truck className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    No hay transportistas registrados
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.terceroRazonSocial ?? "-"}</TableCell>
                  <TableCell className="font-mono text-sm">{t.terceroCuit ?? "-"}</TableCell>
                  <TableCell className="font-mono text-sm">{t.nroCuitTransportista ?? "-"}</TableCell>
                  <TableCell className="font-mono font-medium">{t.patente ?? "-"}</TableCell>
                  <TableCell>{t.marcaVehiculo ?? "-"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{t.domicilioPartida ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={t.activo ? "default" : "secondary"}>
                      {t.activo ? "Activo" : "Inactivo"}
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
