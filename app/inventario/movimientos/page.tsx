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
import { Plus, Search, Filter, ArrowDownLeft, ArrowUpRight, RefreshCw, ArrowLeftRight } from "lucide-react"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"

const mockMovements = [
  { id: "1", date: "2024-01-15", type: "entrada", product: "Laptop HP ProBook", warehouse: "Almacen Central", quantity: 20, reference: "OC-001", user: "Juan Perez" },
  { id: "2", date: "2024-01-15", type: "salida", product: "Monitor Dell 24\"", warehouse: "Almacen Central", quantity: 5, reference: "PED-045", user: "Maria Garcia" },
  { id: "3", date: "2024-01-14", type: "transferencia", product: "Teclado Mecanico", warehouse: "Almacen Norte → Central", quantity: 30, reference: "TRF-012", user: "Carlos Lopez" },
  { id: "4", date: "2024-01-14", type: "ajuste", product: "Mouse Inalambrico", warehouse: "Almacen Central", quantity: -2, reference: "AJ-003", user: "Ana Martinez" },
  { id: "5", date: "2024-01-13", type: "entrada", product: "Cable HDMI 2m", warehouse: "Almacen Sur", quantity: 100, reference: "OC-002", user: "Juan Perez" },
  { id: "6", date: "2024-01-13", type: "salida", product: "Webcam HD", warehouse: "Almacen Central", quantity: 10, reference: "PED-044", user: "Maria Garcia" },
  { id: "7", date: "2024-01-12", type: "entrada", product: "Audifonos Bluetooth", warehouse: "Almacen Central", quantity: 50, reference: "OC-003", user: "Carlos Lopez" },
  { id: "8", date: "2024-01-12", type: "ajuste", product: "Cargador USB-C", warehouse: "Almacen Norte", quantity: 5, reference: "AJ-004", user: "Ana Martinez" },
]

function getTypeBadge(type: string) {
  switch (type) {
    case "entrada":
      return (
        <Badge variant="secondary" className="bg-green-500/10 text-green-500">
          <ArrowDownLeft className="mr-1 h-3 w-3" />
          Entrada
        </Badge>
      )
    case "salida":
      return (
        <Badge variant="secondary" className="bg-red-500/10 text-red-500">
          <ArrowUpRight className="mr-1 h-3 w-3" />
          Salida
        </Badge>
      )
    case "transferencia":
      return (
        <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">
          <ArrowLeftRight className="mr-1 h-3 w-3" />
          Transferencia
        </Badge>
      )
    case "ajuste":
      return (
        <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500">
          <RefreshCw className="mr-1 h-3 w-3" />
          Ajuste
        </Badge>
      )
    default:
      return null
  }
}

function Loading() {
  return null
}

export default function MovimientosPage() {
  const searchParams = useSearchParams()

  return (
    <Suspense fallback={<Loading />}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Movimientos de Stock</h1>
            <p className="text-muted-foreground">
              Historial de entradas, salidas y ajustes de inventario.
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Movimiento
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar movimientos..." className="pl-8" />
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
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Almacen</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Usuario</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockMovements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell className="text-muted-foreground">{movement.date}</TableCell>
                    <TableCell>{getTypeBadge(movement.type)}</TableCell>
                    <TableCell className="font-medium">{movement.product}</TableCell>
                    <TableCell>{movement.warehouse}</TableCell>
                    <TableCell className={`text-right font-mono ${movement.quantity > 0 ? "text-green-500" : "text-red-500"}`}>
                      {movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{movement.reference}</TableCell>
                    <TableCell className="text-muted-foreground">{movement.user}</TableCell>
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
