"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, MoreHorizontal, FolderTree } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const mockCategories = [
  { id: "1", name: "Electronica", description: "Equipos electronicos y computadoras", products: 156, parent: null },
  { id: "2", name: "Laptops", description: "Computadoras portatiles", products: 45, parent: "Electronica" },
  { id: "3", name: "Monitores", description: "Pantallas y monitores", products: 32, parent: "Electronica" },
  { id: "4", name: "Perifericos", description: "Teclados, mouse y accesorios", products: 89, parent: null },
  { id: "5", name: "Teclados", description: "Teclados de escritorio", products: 34, parent: "Perifericos" },
  { id: "6", name: "Mouse", description: "Dispositivos apuntadores", products: 28, parent: "Perifericos" },
  { id: "7", name: "Accesorios", description: "Cables, adaptadores y mas", products: 234, parent: null },
  { id: "8", name: "Audio", description: "Audifonos y parlantes", products: 67, parent: null },
]

export default function CategoriasPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categorias</h1>
          <p className="text-muted-foreground">
            Organiza los productos del inventario por categorias.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Categoria
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FolderTree className="h-4 w-4" />
            Arbol de Categorias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripcion</TableHead>
                <TableHead>Categoria Padre</TableHead>
                <TableHead className="text-right">Productos</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockCategories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">
                    {category.parent && <span className="text-muted-foreground mr-2">└</span>}
                    {category.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{category.description}</TableCell>
                  <TableCell>{category.parent || "-"}</TableCell>
                  <TableCell className="text-right">{category.products}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Ver productos</DropdownMenuItem>
                        <DropdownMenuItem>Editar</DropdownMenuItem>
                        <DropdownMenuItem>Agregar subcategoria</DropdownMenuItem>
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
  )
}
