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
import { useDepositos } from '@/lib/hooks/useDepositos'
import { useDefaultSucursalId } from '@/lib/hooks/useSucursales'
import type { Deposito } from '@/lib/types/depositos'

export default function PlantasPage() {
  const defaultSucursalId = useDefaultSucursalId()
  const { depositos, crear, actualizar, eliminar } = useDepositos(defaultSucursalId)
  const [selectedWarehouse, setSelectedWarehouse] = useState<Deposito | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState<Deposito | null>(null)
  const [formData, setFormData] = useState({
    descripcion: '',
    esDefault: false,
  })

  const handleOpenDetail = (d: Deposito) => {
    setSelectedWarehouse(d)
    setIsDetailOpen(true)
  }

  const handleEdit = (d: Deposito) => {
    setEditingWarehouse(d)
    setFormData({ descripcion: d.descripcion, esDefault: d.esDefault })
    setIsFormOpen(true)
  }

  const handleSave = async () => {
    if (editingWarehouse) {
      await actualizar(editingWarehouse.id, formData.descripcion, formData.esDefault)
    } else {
      await crear({ sucursalId: defaultSucursalId ?? 1, descripcion: formData.descripcion, esDefault: formData.esDefault })
    }
    setIsFormOpen(false)
    setEditingWarehouse(null)
    setFormData({ descripcion: '', esDefault: false })
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

      {/* Grid de Depósitos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {depositos.map((deposito) => (
          <Card key={deposito.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <WarehouseIcon className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{deposito.descripcion}</CardTitle>
                    <p className="text-xs text-muted-foreground">ID: {deposito.id}</p>
                  </div>
                </div>
                <Badge variant="outline" className={
                  deposito.activo
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }>
                  {deposito.activo ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {deposito.esDefault && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tipo:</span>
                  <Badge variant="secondary">Por Defecto</Badge>
                </div>
              )}

              <div className="text-sm">
                <span className="text-muted-foreground">Sucursal ID: </span>
                <span className="font-semibold">{deposito.sucursalId}</span>
              </div>

              {/* Botones */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-transparent"
                  onClick={() => handleOpenDetail(deposito)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Ver
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleEdit(deposito)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="text-destructive hover:text-destructive bg-transparent"
                  onClick={async () => { await eliminar(deposito.id) }}
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
              {selectedWarehouse?.descripcion}
            </DialogTitle>
            <DialogDescription>ID: {selectedWarehouse?.id}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 text-sm py-4">
            <div>
              <span className="text-muted-foreground block mb-1">Descripción</span>
              <p className="font-semibold">{selectedWarehouse?.descripcion}</p>
            </div>
            <div>
              <span className="text-muted-foreground block mb-1">Estado</span>
              <Badge variant={selectedWarehouse?.activo ? 'default' : 'secondary'}>
                {selectedWarehouse?.activo ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground block mb-1">Sucursal ID</span>
              <p className="font-semibold">{selectedWarehouse?.sucursalId}</p>
            </div>
            <div>
              <span className="text-muted-foreground block mb-1">Por Defecto</span>
              <p className="font-semibold">{selectedWarehouse?.esDefault ? 'Sí' : 'No'}</p>
            </div>
          </div>

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
              <Label>Descripción</Label>
              <Input
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Almacén Principal"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="esDefault"
                checked={formData.esDefault}
                onChange={(e) => setFormData({ ...formData, esDefault: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="esDefault">Depósito por defecto</Label>
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
