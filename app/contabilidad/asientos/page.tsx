"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Filter, MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import Loading from "./loading"

const mockEntries = [
  { id: "1", number: "AS-001", date: "2024-01-15", description: "Venta de mercaderia - FAC-001", debit: 4500, credit: 4500, status: "publicado" },
  { id: "2", number: "AS-002", date: "2024-01-15", description: "Compra de inventario - OC-001", debit: 12500, credit: 12500, status: "publicado" },
  { id: "3", number: "AS-003", date: "2024-01-14", description: "Pago a proveedor - Tech Supplies", debit: 5200, credit: 5200, status: "publicado" },
  { id: "4", number: "AS-004", date: "2024-01-14", description: "Cobro cliente - Empresa ABC", debit: 2500, credit: 2500, status: "borrador" },
  { id: "5", number: "AS-005", date: "2024-01-13", description: "Pago nomina mensual", debit: 15000, credit: 15000, status: "publicado" },
  { id: "6", number: "AS-006", date: "2024-01-12", description: "Ajuste de inventario", debit: 350, credit: 350, status: "anulado" },
  { id: "7", number: "AS-007", date: "2024-01-12", description: "Pago servicios publicos", debit: 890, credit: 890, status: "publicado" },
]

function getStatusBadge(status: string) {
  switch (status) {
    case "borrador":
      return <Badge variant="secondary">Borrador</Badge>
    case "publicado":
      return <Badge variant="secondary" className="bg-green-500/10 text-green-500">Publicado</Badge>
    case "anulado":
      return <Badge variant="destructive">Anulado</Badge>
    default:
      return null
  }
}

export default function AsientosPage() {
  return (
    <Suspense fallback={<Loading />}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Asientos Contables</h1>
            <p className="text-muted-foreground">
              Registra y administra asientos en el libro diario.
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Asiento
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar asientos..." className="pl-8" />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numero</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Descripcion</TableHead>
                  <TableHead className="text-right">Debe</TableHead>
                  <TableHead className="text-right">Haber</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono text-sm">{entry.number}</TableCell>
                    <TableCell className="text-muted-foreground">{entry.date}</TableCell>
                    <TableCell className="font-medium max-w-[300px] truncate">{entry.description}</TableCell>
                    <TableCell className="text-right font-mono">${entry.debit.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono">${entry.credit.toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(entry.status)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Ver detalles</DropdownMenuItem>
                          <DropdownMenuItem>Editar</DropdownMenuItem>
                          <DropdownMenuItem>Publicar</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Anular</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Suspense>
  )
}
