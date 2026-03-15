"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, FileText, AlertCircle } from "lucide-react"
import { useCartaPorte } from "@/lib/hooks/useCartaPorte"

export default function CartaPortePage() {
  const { cartas, loading, error } = useCartaPorte()
  const [searchTerm, setSearchTerm] = useState("")

  const filtered = cartas.filter((c) =>
    String(c.id).includes(searchTerm) ||
    (c.ctg ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.coe ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.estado ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Carta de Porte</h1>
          <p className="text-muted-foreground">Gestión de cartas de porte y documentos de transporte</p>
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
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cartas.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Con CTG</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cartas.filter((c) => c.ctg).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Con COE</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cartas.filter((c) => c.coe).length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por ID, CTG, COE o estado..."
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
                <TableHead>Estado</TableHead>
                <TableHead>CTG</TableHead>
                <TableHead>COE</TableHead>
                <TableHead>Fecha Emisión</TableHead>
                <TableHead>Desde</TableHead>
                <TableHead>Hasta</TableHead>
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
                    <FileText className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    No hay cartas de porte
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((carta) => (
                <TableRow key={carta.id}>
                  <TableCell className="font-mono text-sm">#{carta.id}</TableCell>
                  <TableCell>
                    <Badge variant={carta.estado === "ACTIVA" ? "default" : "secondary"}>
                      {carta.estado ?? "-"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{carta.ctg ?? "-"}</TableCell>
                  <TableCell className="font-mono text-xs">{carta.coe ?? "-"}</TableCell>
                  <TableCell>{carta.fechaEmision ?? "-"}</TableCell>
                  <TableCell>{carta.desde ?? "-"}</TableCell>
                  <TableCell>{carta.hasta ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
