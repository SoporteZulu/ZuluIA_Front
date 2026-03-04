'use client'

import React, { useState } from 'react'
import { Plus, Search, Edit, Trash2, Eye, Save, X, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { products as initialProducts } from '@/lib/sales-data'
import type { Product } from '@/lib/sales-types'

const ProductosPage = () => {
  const [products, setProducts] = useState(initialProducts)
  const [searchTerm, setSearchTerm] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [detailProduct, setDetailProduct] = useState<Product | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  
  const [formData, setFormData] = useState({
    sku: '',
    nombre: '',
    descripcion: '',
    categoria: '',
    linea: '',
    marca: '',
    uom: 'unid',
    costoProm: 0,
    precioVenta: 0,
    stock: 0,
    foto: '',
    proveedor: '',
  })

  const filteredProducts = products.filter(p =>
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleViewDetail = (product: Product) => {
    setDetailProduct(product)
    setIsDetailOpen(true)
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      sku: product.sku,
      nombre: product.nombre,
      descripcion: product.descripcion || '',
      categoria: product.categoria || '',
      linea: product.linea || '',
      marca: product.marca || '',
      uom: product.uom,
      costoProm: product.costoProm,
      precioVenta: product.precioVenta,
      stock: product.stock,
      foto: product.foto || '',
      proveedor: product.proveedor || '',
    })
    setIsFormOpen(true)
  }

  const handleDelete = (product: Product) => {
    setProductToDelete(product)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (productToDelete) {
      setProducts(products.filter(p => p.id !== productToDelete.id))
      setIsDeleteDialogOpen(false)
      setProductToDelete(null)
    }
  }

  const handleSubmit = () => {
    if (editingProduct) {
      // Update existing product
      setProducts(products.map(p => 
        p.id === editingProduct.id 
          ? { ...p, ...formData, updatedAt: new Date() }
          : p
      ))
    } else {
      // Create new product
      const newProduct: Product = {
        id: `prod-${Date.now()}`,
        ...formData,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      setProducts([...products, newProduct])
    }
    
    setIsFormOpen(false)
    setEditingProduct(null)
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      sku: '',
      nombre: '',
      descripcion: '',
      categoria: '',
      linea: '',
      marca: '',
      uom: 'unid',
      costoProm: 0,
      precioVenta: 0,
      stock: 0,
      foto: '',
      proveedor: '',
    })
  }

  const handleOpenNewForm = () => {
    setEditingProduct(null)
    resetForm()
    setIsFormOpen(true)
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Productos</h1>
          <p className="text-muted-foreground">Catálogo de productos y gestión de precios</p>
        </div>
        <Button onClick={handleOpenNewForm}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Producto
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Productos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stock Bajo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{products.filter(p => p.stock < 50).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor Total Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${products.reduce((sum, p) => sum + (p.costoProm * p.stock), 0).toLocaleString('es-AR')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Margen Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(products.reduce((sum, p) => sum + ((p.precioVenta - p.costoProm) / p.precioVenta * 100), 0) / products.length).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por SKU o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Costo</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead className="text-right">Margen</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const margen = ((product.precioVenta - product.costoProm) / product.precioVenta * 100).toFixed(1)
                return (
                  <TableRow key={product.id} onClick={() => handleViewDetail(product)} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                    <TableCell className="font-medium">{product.nombre}</TableCell>
                    <TableCell>{product.categoria || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={product.stock < 50 ? 'destructive' : 'outline'}>
                        {product.stock} {product.uom}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">${product.costoProm.toLocaleString('es-AR')}</TableCell>
                    <TableCell className="text-right font-medium">${product.precioVenta.toLocaleString('es-AR')}</TableCell>
                    <TableCell className="text-right">{margen}%</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleViewDetail(product)} title="Ver detalle">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(product)} title="Editar">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(product)} title="Eliminar">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {detailProduct?.nombre}
              <Badge variant={detailProduct && detailProduct.stock < 50 ? 'destructive' : 'default'}>
                {detailProduct && detailProduct.stock < 50 ? 'Stock Bajo' : 'Stock OK'}
              </Badge>
            </DialogTitle>
            <DialogDescription>SKU: {detailProduct?.sku}</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="precios">Precios y Costos</TabsTrigger>
              <TabsTrigger value="inventario">Inventario</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Información General</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground block mb-1">Nombre</span>
                      <p className="font-medium">{detailProduct?.nombre}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-1">SKU</span>
                      <p className="font-mono font-medium">{detailProduct?.sku}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-1">Categoría</span>
                      <p className="font-medium">{detailProduct?.categoria || '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-1">Línea</span>
                      <p className="font-medium">{detailProduct?.linea || '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-1">Marca</span>
                      <p className="font-medium">{detailProduct?.marca || '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-1">Unidad de Medida</span>
                      <p className="font-medium uppercase">{detailProduct?.uom}</p>
                    </div>
                    {detailProduct?.proveedor && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground block mb-1">Proveedor</span>
                        <p className="font-medium">{detailProduct.proveedor}</p>
                      </div>
                    )}
                    {detailProduct?.descripcion && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground block mb-1">Descripción</span>
                        <p className="text-sm">{detailProduct.descripcion}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="precios" className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-muted-foreground">Costo Promedio</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-blue-600">
                      ${detailProduct?.costoProm.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-muted-foreground">Precio de Venta</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-purple-600">
                      ${detailProduct?.precioVenta.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-muted-foreground">Margen</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-orange-600">
                      {detailProduct ? ((detailProduct.precioVenta - detailProduct.costoProm) / detailProduct.precioVenta * 100).toFixed(1) : 0}%
                    </p>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Análisis de Rentabilidad</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Ganancia Unitaria:</span>
                      <span className="font-semibold">
                        ${detailProduct ? (detailProduct.precioVenta - detailProduct.costoProm).toLocaleString('es-AR', { minimumFractionDigits: 2 }) : '0'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Valor Stock al Costo:</span>
                      <span className="font-semibold">
                        ${detailProduct ? (detailProduct.costoProm * detailProduct.stock).toLocaleString('es-AR', { minimumFractionDigits: 2 }) : '0'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Valor Stock al Precio:</span>
                      <span className="font-semibold text-green-600">
                        ${detailProduct ? (detailProduct.precioVenta * detailProduct.stock).toLocaleString('es-AR', { minimumFractionDigits: 2 }) : '0'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="inventario" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Stock Actual</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-4xl font-bold text-green-600">{detailProduct?.stock}</p>
                      <p className="text-sm text-muted-foreground mt-1">{detailProduct?.uom}</p>
                    </div>
                    {detailProduct && detailProduct.stock < 50 && (
                      <Alert className="w-[200px]">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          Stock por debajo del mínimo
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Movimientos Recientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No hay movimientos recientes registrados</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Cerrar
            </Button>
            <Button onClick={() => {
              setIsDetailOpen(false)
              detailProduct && handleEdit(detailProduct)
            }}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
            <DialogDescription>
              {editingProduct ? `Editando ${editingProduct.nombre}` : 'Completa los datos para crear un nuevo producto'}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basicos" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basicos">Datos Básicos</TabsTrigger>
              <TabsTrigger value="precios">Precios</TabsTrigger>
              <TabsTrigger value="inventario">Inventario</TabsTrigger>
            </TabsList>

            <TabsContent value="basicos" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>SKU *</Label>
                  <Input 
                    placeholder="PROD-001" 
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input 
                    placeholder="Nombre del producto" 
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Input 
                    placeholder="Electrónica, Indumentaria, etc." 
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Línea</Label>
                  <Input 
                    placeholder="Línea del producto" 
                    value={formData.linea}
                    onChange={(e) => setFormData({ ...formData, linea: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Marca</Label>
                  <Input 
                    placeholder="Marca" 
                    value={formData.marca}
                    onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unidad de Medida *</Label>
                  <Select value={formData.uom} onValueChange={(value) => setFormData({ ...formData, uom: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unid">Unidad</SelectItem>
                      <SelectItem value="kg">Kilogramo</SelectItem>
                      <SelectItem value="lts">Litros</SelectItem>
                      <SelectItem value="mts">Metros</SelectItem>
                      <SelectItem value="caja">Caja</SelectItem>
                      <SelectItem value="pallet">Pallet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Proveedor</Label>
                  <Input 
                    placeholder="Proveedor principal" 
                    value={formData.proveedor}
                    onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Foto URL</Label>
                  <Input 
                    placeholder="https://..." 
                    value={formData.foto}
                    onChange={(e) => setFormData({ ...formData, foto: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Descripción</Label>
                  <Textarea 
                    placeholder="Descripción detallada del producto" 
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="precios" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Costo Promedio *</Label>
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    value={formData.costoProm}
                    onChange={(e) => setFormData({ ...formData, costoProm: Number.parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Precio de Venta *</Label>
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    value={formData.precioVenta}
                    onChange={(e) => setFormData({ ...formData, precioVenta: Number.parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              
              {formData.costoProm > 0 && formData.precioVenta > 0 && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground block mb-1">Margen</span>
                        <p className="text-lg font-bold text-orange-600">
                          {((formData.precioVenta - formData.costoProm) / formData.precioVenta * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-1">Ganancia Unitaria</span>
                        <p className="text-lg font-bold text-green-600">
                          ${(formData.precioVenta - formData.costoProm).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-1">Markup</span>
                        <p className="text-lg font-bold">
                          {((formData.precioVenta / formData.costoProm - 1) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="inventario" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Stock Inicial *</Label>
                  <Input 
                    type="number" 
                    placeholder="0" 
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: Number.parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Cantidad disponible en inventario
                  </p>
                </div>
              </div>
              
              {formData.stock > 0 && formData.costoProm > 0 && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-6">
                    <div className="text-sm">
                      <span className="text-muted-foreground block mb-1">Valor Total del Stock</span>
                      <p className="text-2xl font-bold text-blue-600">
                        ${(formData.stock * formData.costoProm).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setIsFormOpen(false)
              setEditingProduct(null)
              resetForm()
            }}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.sku || !formData.nombre}>
              <Save className="h-4 w-4 mr-2" />
              {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar Eliminación
            </DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. El producto será eliminado permanentemente.
            </DialogDescription>
          </DialogHeader>
          
          {productToDelete && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SKU:</span>
                    <span className="font-mono font-medium">{productToDelete.sku}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nombre:</span>
                    <span className="font-medium">{productToDelete.nombre}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stock:</span>
                    <span className="font-medium">{productToDelete.stock} {productToDelete.uom}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setIsDeleteDialogOpen(false)
              setProductToDelete(null)
            }}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar Producto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ProductosPage
