"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, MapPin, Package, MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const mockWarehouses = [
  {
    id: "1",
    code: "ALM-001",
    name: "Almacen Central",
    address: "Av. Principal 123, Ciudad",
    products: 856,
    totalStock: 12500,
    isActive: true,
  },
  {
    id: "2",
    code: "ALM-002",
    name: "Almacen Norte",
    address: "Calle Norte 456, Zona Industrial",
    products: 234,
    totalStock: 4200,
    isActive: true,
  },
  {
    id: "3",
    code: "ALM-003",
    name: "Almacen Sur",
    address: "Av. Sur 789, Parque Logistico",
    products: 144,
    totalStock: 2100,
    isActive: true,
  },
  {
    id: "4",
    code: "ALM-004",
    name: "Almacen Temporal",
    address: "Bodega 12, Centro de Distribucion",
    products: 0,
    totalStock: 0,
    isActive: false,
  },
]

export default function AlmacenesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Almacenes</h1>
          <p className="text-muted-foreground">
            Administra las ubicaciones de almacenamiento.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Almacen
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockWarehouses.map((warehouse) => (
          <Card key={warehouse.id} className={!warehouse.isActive ? "opacity-60" : ""}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{warehouse.name}</CardTitle>
                  {warehouse.isActive ? (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-500">Activo</Badge>
                  ) : (
                    <Badge variant="secondary">Inactivo</Badge>
                  )}
                </div>
                <CardDescription className="font-mono text-xs">{warehouse.code}</CardDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Ver inventario</DropdownMenuItem>
                  <DropdownMenuItem>Editar</DropdownMenuItem>
                  <DropdownMenuItem>{warehouse.isActive ? "Desactivar" : "Activar"}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{warehouse.address}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Productos</p>
                  <p className="text-lg font-semibold">{warehouse.products}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Stock Total</p>
                  <p className="text-lg font-semibold">{warehouse.totalStock.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
