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
import { products } from '@/lib/wms-data'

export default function InventarioPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [filterCategory, setFilterCategory] = useState('todos')
  const [filterStatus, setFilterStatus] = useState('todos')

  const filteredProducts = products.filter(p => {
    const searchMatch = p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       p.name.toLowerCase().includes(searchQuery.toLowerCase())
    const categoryMatch = filterCategory === 'todos' || p.category === filterCategory
    return searchMatch && categoryMatch
  })

  const getStatusColor = (stock: number, minStock: number) => {
    if (stock <= 0) return 'destructive'
    if (stock <= minStock) return 'secondary'
    return 'default'
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
            <div className="text-2xl font-bold">{products.length}</div>
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
              {products.filter(p => p.minStock > 0).length}
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
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono text-sm font-semibold">{product.sku}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.category}</Badge>
                    </TableCell>
                    <TableCell>{product.uom}</TableCell>
                    <TableCell className="text-right font-semibold">0</TableCell>
                    <TableCell className="text-right text-muted-foreground">{product.minStock}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{product.maxStock}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-red-50 text-red-700 border-red-200">
                        Sin stock
                      </Badge>
                    </TableCell>
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
              {selectedProduct?.sku} - {selectedProduct?.name}
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
                  <span className="text-muted-foreground block mb-1">SKU</span>
                  <p className="font-mono font-semibold">{selectedProduct?.sku}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Categoría</span>
                  <p className="font-semibold">{selectedProduct?.category}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Unidad de Medida</span>
                  <p className="font-semibold">{selectedProduct?.uom}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Método Valorización</span>
                  <p className="font-semibold">{selectedProduct?.valuationMethod}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground block mb-1">Descripción</span>
                  <p className="text-sm">{selectedProduct?.description}</p>
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground block mb-1">Stock Mínimo</span>
                    <p className="font-semibold">{selectedProduct?.minStock} {selectedProduct?.uom}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Stock Máximo</span>
                    <p className="font-semibold">{selectedProduct?.maxStock} {selectedProduct?.uom}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Punto de Reorden</span>
                    <p className="font-semibold">{selectedProduct?.reorderPoint} {selectedProduct?.uom}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="batch" checked={selectedProduct?.requiresBatch} disabled />
                  <Label htmlFor="batch" className="text-sm">Requiere Lote</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="serial" checked={selectedProduct?.requiresSerial} disabled />
                  <Label htmlFor="serial" className="text-sm">Requiere Serie</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="expiration" checked={selectedProduct?.requiresExpiration} disabled />
                  <Label htmlFor="expiration" className="text-sm">Requiere Fecha Vencimiento</Label>
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
