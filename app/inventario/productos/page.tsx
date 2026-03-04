"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

const mockProducts = [
  { id: "1", code: "PROD-001", name: "Laptop HP ProBook", category: "Electronica", stock: 45, minStock: 10, price: 899.99, status: "ok" },
  { id: "2", code: "PROD-002", name: "Monitor Dell 24\"", category: "Electronica", stock: 8, minStock: 10, price: 299.99, status: "low" },
  { id: "3", code: "PROD-003", name: "Teclado Mecanico", category: "Perifericos", stock: 120, minStock: 20, price: 79.99, status: "ok" },
  { id: "4", code: "PROD-004", name: "Mouse Inalambrico", category: "Perifericos", stock: 3, minStock: 15, price: 29.99, status: "critical" },
  { id: "5", code: "PROD-005", name: "Cable HDMI 2m", category: "Accesorios", stock: 200, minStock: 50, price: 12.99, status: "ok" },
  { id: "6", code: "PROD-006", name: "Webcam HD", category: "Perifericos", stock: 25, minStock: 10, price: 59.99, status: "ok" },
  { id: "7", code: "PROD-007", name: "Audífonos Bluetooth", category: "Audio", stock: 0, minStock: 10, price: 49.99, status: "out" },
  { id: "8", code: "PROD-008", name: "Cargador USB-C", category: "Accesorios", stock: 85, minStock: 30, price: 24.99, status: "ok" },
]

function getStockBadge(status: string) {
  switch (status) {
    case "ok":
      return <Badge variant="secondary" className="bg-green-500/10 text-green-500">Normal</Badge>
    case "low":
      return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500">Bajo</Badge>
    case "critical":
      return <Badge variant="secondary" className="bg-orange-500/10 text-orange-500">Critico</Badge>
    case "out":
      return <Badge variant="destructive">Agotado</Badge>
    default:
      return null
  }
}

export default function ProductosPage() {
  const [search, setSearch] = useState("")
  const searchParams = useSearchParams()

  const filteredProducts = mockProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Suspense fallback={null}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Productos</h1>
            <p className="text-muted-foreground">
              Gestiona el catalogo de productos del inventario.
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Producto
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar productos..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
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
                  <TableHead>Codigo</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono text-sm">{product.code}</TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell className="text-right">{product.stock}</TableCell>
                    <TableCell className="text-right">${product.price.toFixed(2)}</TableCell>
                    <TableCell>{getStockBadge(product.status)}</TableCell>
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
                          <DropdownMenuItem>Ajustar stock</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Eliminar</DropdownMenuItem>
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
