"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, CreditCard, AlertCircle } from "lucide-react"
import { useCheques } from "@/lib/hooks/useCheques"

const estadoVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  cartera: "default",
  depositado: "outline",
  acreditado: "secondary",
  rechazado: "destructive",
  entregado: "outline",
}

const estadoLabel: Record<string, string> = {
  cartera: "En Cartera",
  depositado: "Depositado",
  acreditado: "Acreditado",
  rechazado: "Rechazado",
  entregado: "Entregado",
}

export default function ChequesPage() {
  const { cheques, loading, error, page, setPage, totalPages, depositar, acreditar, rechazar, entregar } = useCheques()
  const [searchTerm, setSearchTerm] = useState("")

  const filtered = cheques.filter((c) =>
    c.nroCheque.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.banco ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatCurrency = (value: number) =>
    value.toLocaleString("es-AR", { style: "currency", currency: "ARS" })

  const formatDate = (value?: string) =>
    value ? new Date(value).toLocaleDateString("es-AR") : "-"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cheques</h1>
          <p className="text-muted-foreground">Gestión de cheques y movimientos</p>
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
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Cheques</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{cheques.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">En Cartera</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-500">{cheques.filter((c) => c.estado === "cartera").length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Acreditados</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-500">{cheques.filter((c) => c.estado === "acreditado").length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Rechazados</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-500">{cheques.filter((c) => c.estado === "rechazado").length}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por N° cheque o banco..."
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
                <TableHead>N° Cheque</TableHead>
                <TableHead>Banco</TableHead>
                <TableHead>Importe</TableHead>
                <TableHead>Emisión</TableHead>
                <TableHead>Vencimiento</TableHead>
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
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <CreditCard className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    No hay cheques registrados
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((cheque) => (
                <TableRow key={cheque.id}>
                  <TableCell className="font-mono">{cheque.nroCheque}</TableCell>
                  <TableCell>{cheque.banco ?? "-"}</TableCell>
                  <TableCell className="font-mono">{formatCurrency(cheque.importe)}</TableCell>
                  <TableCell>{formatDate(cheque.fechaEmision)}</TableCell>
                  <TableCell>{formatDate(cheque.fechaVencimiento)}</TableCell>
                  <TableCell>
                    <Badge variant={estadoVariant[cheque.estado] ?? "secondary"}>
                      {estadoLabel[cheque.estado] ?? cheque.estado}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {cheque.estado === "cartera" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => depositar(cheque.id, new Date().toISOString().split('T')[0])}>Depositar</Button>
                          <Button size="sm" variant="outline" onClick={() => entregar(cheque.id)}>Entregar</Button>
                        </>
                      )}
                      {cheque.estado === "depositado" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => acreditar(cheque.id, new Date().toISOString().split('T')[0])}>Acreditar</Button>
                          <Button size="sm" variant="destructive" onClick={() => rechazar(cheque.id)}>Rechazar</Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
          <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Siguiente</Button>
        </div>
      )}
    </div>
  )
}
