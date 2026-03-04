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
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Warehouse as WarehouseIcon,
  MapPin,
  Users,
  Settings,
  Grid3x3,
  AlertCircle
} from 'lucide-react'
import { warehouses } from '@/lib/wms-data'

export default function PlantasPage() {
  const [warehouseList, setWarehouseList] = useState(warehouses)
  const [selectedWarehouse, setSelectedWarehouse] = useState(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'principal',
    address: '',
    capacity: 0,
    supervisor: '',
  })

  const handleOpenDetail = (warehouse) => {
    setSelectedWarehouse(warehouse)
    setIsDetailOpen(true)
  }

  const handleEdit = (warehouse) => {
    setEditingWarehouse(warehouse)
    setFormData({
      code: warehouse.code,
      name: warehouse.name,
      type: warehouse.type,
      address: warehouse.address,
      capacity: warehouse.capacity,
      supervisor: warehouse.supervisor || '',
    })
    setIsFormOpen(true)
  }

  const handleSave = () => {
    if (editingWarehouse) {
      setWarehouseList(warehouseList.map(w => 
        w.id === editingWarehouse.id 
          ? { ...w, ...formData }
          : w
      ))
    } else {
      setWarehouseList([...warehouseList, {
        id: `wh-${Date.now()}`,
        ...formData,
        zones: [],
        occupancy_percentage: 0,
        status: 'activo',
        createdAt: new Date(),
        updatedAt: new Date(),
      }])
    }
    setIsFormOpen(false)
    setEditingWarehouse(null)
    setFormData({ code: '', name: '', type: 'principal', address: '', capacity: 0, supervisor: '' })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Almacenes</h1>
          <p className="text-muted-foreground mt-1">Administra tus plantas y ubicaciones</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Almacén
        </Button>
      </div>

      {/* Grid de Almacenes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {warehouseList.map((warehouse) => (
          <Card key={warehouse.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <WarehouseIcon className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{warehouse.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{warehouse.code}</p>
                  </div>
                </div>
                <Badge variant="outline" className={
                  warehouse.status === 'activo' 
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }>
                  {warehouse.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tipo */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tipo:</span>
                <Badge variant="secondary">{warehouse.type}</Badge>
              </div>

              {/* Ocupación */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Ocupación:</span>
                  <span className="font-semibold">{warehouse.occupancy_percentage}%</span>
                </div>
                <Progress value={warehouse.occupancy_percentage} />
              </div>

              {/* Capacidad */}
              <div className="text-sm">
                <span className="text-muted-foreground">Capacidad: </span>
                <span className="font-semibold">{warehouse.capacity} {warehouse.capacityUnit}</span>
              </div>

              {/* Ubicaciones */}
              <div className="text-sm">
                <span className="text-muted-foreground">Ubicaciones: </span>
                <span className="font-semibold">0 configuradas</span>
              </div>

              {/* Botones */}
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 bg-transparent"
                  onClick={() => handleOpenDetail(warehouse)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Ver
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => handleEdit(warehouse)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  className="text-destructive hover:text-destructive bg-transparent"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <WarehouseIcon className="h-5 w-5" />
              {selectedWarehouse?.name}
            </DialogTitle>
            <DialogDescription>{selectedWarehouse?.code}</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="ubicaciones">Ubicaciones</TabsTrigger>
              <TabsTrigger value="inventario">Inventario</TabsTrigger>
              <TabsTrigger value="config">Config</TabsTrigger>
            </TabsList>

            {/* Tab General */}
            <TabsContent value="general" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block mb-1">Código</span>
                  <p className="font-semibold">{selectedWarehouse?.code}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Tipo</span>
                  <Badge variant="secondary">{selectedWarehouse?.type}</Badge>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground block mb-1">Dirección</span>
                  <p className="text-sm flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    {selectedWarehouse?.address}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Supervisor</span>
                  <p className="font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {selectedWarehouse?.supervisor || 'No asignado'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Control de Temperatura</span>
                  <p className="font-semibold">
                    {selectedWarehouse?.temperature_controlled ? 'Sí' : 'No'}
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Tab Ubicaciones */}
            <TabsContent value="ubicaciones" className="space-y-4 mt-4">
              <Alert>
                <Grid3x3 className="h-4 w-4" />
                <AlertDescription>
                  No hay ubicaciones configuradas. Crea una estructura de pasillo-rack-nivel.
                </AlertDescription>
              </Alert>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Configurar Ubicaciones
              </Button>
            </TabsContent>

            {/* Tab Inventario */}
            <TabsContent value="inventario" className="space-y-4 mt-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ocupación:</span>
                  <span className="font-semibold">{selectedWarehouse?.occupancy_percentage}%</span>
                </div>
                <Progress value={selectedWarehouse?.occupancy_percentage || 0} />
                <div className="flex justify-between pt-2">
                  <span className="text-muted-foreground">Capacidad total:</span>
                  <span className="font-semibold">
                    {selectedWarehouse?.capacity} {selectedWarehouse?.capacityUnit}
                  </span>
                </div>
              </div>
            </TabsContent>

            {/* Tab Config */}
            <TabsContent value="config" className="space-y-4 mt-4">
              <Alert>
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  Configuración avanzada del almacén
                </AlertDescription>
              </Alert>
              <div className="space-y-3">
                <Button variant="outline" className="w-full bg-transparent">Reglas de Almacenamiento</Button>
                <Button variant="outline" className="w-full bg-transparent">Zonas Especiales</Button>
                <Button variant="outline" className="w-full bg-transparent">Capacidades Límite</Button>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Cerrar</Button>
            <Button>Editar Almacén</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingWarehouse ? 'Editar Almacén' : 'Nuevo Almacén'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Código</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="ALM-001"
              />
            </div>

            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Almacén Principal"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="principal">Principal</SelectItem>
                  <SelectItem value="satelite">Satélite</SelectItem>
                  <SelectItem value="crossdocking">Cross-docking</SelectItem>
                  <SelectItem value="cuarentena">Cuarentena</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Calle y número"
              />
            </div>

            <div className="space-y-2">
              <Label>Capacidad</Label>
              <Input
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                placeholder="5000"
              />
            </div>

            <div className="space-y-2">
              <Label>Supervisor</Label>
              <Input
                value={formData.supervisor}
                onChange={(e) => setFormData({ ...formData, supervisor: e.target.value })}
                placeholder="Nombre del supervisor"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
