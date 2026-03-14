'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Plus,
  Edit,
  Eye,
  Package,
  AlertCircle,
  TrendingUp,
  Download,
  Filter,
  Search,
  BarChart3,
} from 'lucide-react'
import { useItems } from '@/lib/hooks/useItems'
import type { Item } from '@/lib/types/items'

export default function InventarioPage() {
  const { items, loading, error } = useItems()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Item | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [filterCategory, setFilterCategory] = useState('todos')

  const filteredProducts = items.filter(p => {
    const searchMatch = p.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       p.descripcion.toLowerCase().includes(searchQuery.toLowerCase())
    const categoryMatch = filterCategory === 'todos' || String(p.categoriaId) === filterCategory
    return searchMatch && categoryMatch
  })

  const getStatusBadge = (item: Item) => {
    if ((item.stock ?? 0) <= 0)
      return <Badge variant="secondary" className="bg-red-50 text-red-700 border-red-200">Sin stock</Badge>
    if ((item.stock ?? 0) <= item.stockMinimo)
      return <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-orange-200">Stock bajo</Badge>
    return <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">OK</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventario y Stock</h1>
          <p className="text-muted-foreground mt-1">Control y visualización de inventario</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Ajustar Stock
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
            <p className="text-xs text-muted-foreground mt-1">SKUs activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {items.filter(p => (p.stock ?? 0) <= p.stockMinimo && p.manejaStock).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Requieren reorden</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencimiento Próximo</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">Menos de 30 días</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$2.45M</div>
            <p className="text-xs text-muted-foreground mt-1">Inventario valorizado</p>
          </CardContent>
        </Card>
      </div>

      {/* Búsqueda y Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Productos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Buscador */}
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label>Buscar por SKU o Descripción</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas las categorías</SelectItem>
                  <SelectItem value="Electrónica">Electrónica</SelectItem>
                  <SelectItem value="Lubricantes">Lubricantes</SelectItem>
                  <SelectItem value="Accesorios">Accesorios</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {/* Tabla */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead className="text-right">Stock Actual</TableHead>
                  <TableHead className="text-right">Mínimo</TableHead>
                  <TableHead className="text-right">Máximo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Cargando items...</TableCell></TableRow>
                )}
                {error && (
                  <TableRow><TableCell colSpan={8} className="text-center py-10 text-destructive">{error}</TableCell></TableRow>
                )}
                {!loading && !error && filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono text-sm font-semibold">{product.codigo}</TableCell>
                    <TableCell>{product.descripcion}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.categoriaDescripcion ?? `Cat.${product.categoriaId}`}</Badge>
                    </TableCell>
                    <TableCell>{product.unidadMedidaDescripcion ?? `UM${product.unidadMedidaId}`}</TableCell>
                    <TableCell className="text-right font-semibold">{product.stock ?? 0}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{product.stockMinimo}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{product.stockMaximo ?? '-'}</TableCell>
                    <TableCell>{getStatusBadge(product)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedProduct(product)
                          setIsDetailOpen(true)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && !error && filteredProducts.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">No se encontraron productos.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {selectedProduct?.codigo} - {selectedProduct?.descripcion}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="stock">Stock</TabsTrigger>
              <TabsTrigger value="kardex">Kardex</TabsTrigger>
              <TabsTrigger value="analytics">Analítica</TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block mb-1">Código</span>
                  <p className="font-mono font-semibold">{selectedProduct?.codigo}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Categoría</span>
                  <p className="font-semibold">{selectedProduct?.categoriaDescripcion ?? `Cat.${selectedProduct?.categoriaId}`}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Unidad de Medida</span>
                  <p className="font-semibold">{selectedProduct?.unidadMedidaDescripcion ?? `UM${selectedProduct?.unidadMedidaId}`}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Precio Costo</span>
                  <p className="font-semibold">${selectedProduct?.precioCosto?.toLocaleString()}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground block mb-1">Descripción</span>
                  <p className="text-sm">{selectedProduct?.descripcionAdicional ?? selectedProduct?.descripcion}</p>
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground block mb-1">Stock Mínimo</span>
                    <p className="font-semibold">{selectedProduct?.stockMinimo} {selectedProduct?.unidadMedidaDescripcion}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Stock Máximo</span>
                    <p className="font-semibold">{selectedProduct?.stockMaximo ?? '-'} {selectedProduct?.unidadMedidaDescripcion}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Stock Actual</span>
                    <p className="font-semibold">{selectedProduct?.stock ?? 0} {selectedProduct?.unidadMedidaDescripcion}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="stock" checked={selectedProduct?.manejaStock} disabled />
                  <Label htmlFor="stock" className="text-sm">Maneja Stock</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="producto" checked={selectedProduct?.esProducto} disabled />
                  <Label htmlFor="producto" className="text-sm">Es Producto</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="servicio" checked={selectedProduct?.esServicio} disabled />
                  <Label htmlFor="servicio" className="text-sm">Es Servicio</Label>
                </div>
              </div>
            </TabsContent>

            {/* Stock Tab */}
            <TabsContent value="stock" className="space-y-4 mt-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Desglose de stock por almacén y ubicación
                </AlertDescription>
              </Alert>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Almacén</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Disponible</TableHead>
                    <TableHead>Reservado</TableHead>
                    <TableHead>Bloqueado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6">
                      <p className="text-muted-foreground">Sin stock registrado</p>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TabsContent>

            {/* Kardex Tab */}
            <TabsContent value="kardex" className="space-y-4 mt-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Historial de movimientos (Kardex)
                </AlertDescription>
              </Alert>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo Movimiento</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6">
                      <p className="text-muted-foreground">Sin movimientos</p>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-4 mt-4">
              <Alert>
                <BarChart3 className="h-4 w-4" />
                <AlertDescription>
                  Gráficos y análisis de rotación e inventario
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Cerrar</Button>
            <Button>Editar Producto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
