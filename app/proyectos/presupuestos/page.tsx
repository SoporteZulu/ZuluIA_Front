'use client'

import { AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from 'lucide-react'
import { Alert } from "@/components/ui/alert"
import React, { useState } from 'react'
import { Plus, Edit, Trash2, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface Item {
  id: string
  proyecto: string
  categoria: 'Materiales' | 'Mano de Obra' | 'Equipamiento' | 'Otros'
  descripcion: string
  presupuestado: number
  gastado: number
  cantidad: number
  fecha: string
}

const PresupuestosPage = () => {
  const [items, setItems] = useState<Item[]>([
    {
      id: '1',
      proyecto: 'Proyecto A',
      categoria: 'Materiales',
      descripcion: 'Cemento y acero',
      presupuestado: 5000,
      gastado: 4200,
      cantidad: 50,
      fecha: '2026-02-01',
    },
    {
      id: '2',
      proyecto: 'Proyecto A',
      categoria: 'Mano de Obra',
      descripcion: 'Mano de obra especializada',
      presupuestado: 8000,
      gastado: 7500,
      cantidad: 100,
      fecha: '2026-02-05',
    },
    {
      id: '3',
      proyecto: 'Proyecto B',
      categoria: 'Equipamiento',
      descripcion: 'Maquinaria pesada',
      presupuestado: 12000,
      gastado: 9800,
      cantidad: 10,
      fecha: '2026-02-10',
    },
    {
      id: '4',
      proyecto: 'Proyecto B',
      categoria: 'Otros',
      descripcion: 'Logística y transporte',
      presupuestado: 3000,
      gastado: 2500,
      cantidad: 20,
      fecha: '2026-02-08',
    },
  ])

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [formData, setFormData] = useState<Partial<Item>>({})

  const proyectos = ['Proyecto A', 'Proyecto B', 'Proyecto C']
  const categorias = ['Materiales', 'Mano de Obra', 'Equipamiento', 'Otros']

  const handleOpenForm = (item?: Item) => {
    if (item) {
      setEditingItem(item)
      setFormData(item)
    } else {
      setEditingItem(null)
      setFormData({ categoria: 'Materiales' })
    }
    setIsFormOpen(true)
  }

  const handleSaveItem = () => {
    if (!formData.proyecto || !formData.descripcion || !formData.presupuestado) return

    if (editingItem) {
      setItems(items.map(i => i.id === editingItem.id ? { ...editingItem, ...formData } as Item : i))
    } else {
      setItems([...items, {
        id: `item-${Date.now()}`,
        proyecto: formData.proyecto || '',
        categoria: (formData.categoria as any) || 'Otros',
        descripcion: formData.descripcion || '',
        presupuestado: formData.presupuestado || 0,
        gastado: formData.gastado || 0,
        cantidad: formData.cantidad || 1,
        fecha: formData.fecha || new Date().toISOString().split('T')[0],
      }])
    }
    setIsFormOpen(false)
  }

  const handleDeleteItem = (id: string) => {
    setItems(items.filter(i => i.id !== id))
  }

  const totalPresupuestado = items.reduce((sum, i) => sum + i.presupuestado, 0)
  const totalGastado = items.reduce((sum, i) => sum + i.gastado, 0)
  const disponible = totalPresupuestado - totalGastado
  const porcentajeUtilizado = ((totalGastado / totalPresupuestado) * 100)

  const chartData = proyectos.map(p => {
    const itemsProy = items.filter(i => i.proyecto === p)
    return {
      nombre: p,
      Presupuesto: itemsProy.reduce((sum, i) => sum + i.presupuestado, 0),
      Gastado: itemsProy.reduce((sum, i) => sum + i.gastado, 0),
      Disponible: itemsProy.reduce((sum, i) => sum + (i.presupuestado - i.gastado), 0),
    }
  })

  const pieData = categorias.map(c => ({
    categoria: c,
    monto: items.filter(i => i.categoria === c).reduce((sum, i) => sum + i.gastado, 0),
  }))

  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b']

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Presupuestos</h1>
          <p className="text-muted-foreground mt-1">Gestiona presupuestos y costos de proyectos</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Gasto
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Presupuesto Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">${(totalPresupuestado / 1000).toFixed(0)}k</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Gastado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">${(totalGastado / 1000).toFixed(0)}k</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Disponible</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">${(disponible / 1000).toFixed(0)}k</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">% Utilizado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{porcentajeUtilizado.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {porcentajeUtilizado > 80 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            Presupuesto utilizado en más del 80%. Considere revisar los gastos.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Presupuesto por Proyecto</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombre" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value}`} />
                <Legend />
                <Bar dataKey="Presupuesto" fill="#6366f1" />
                <Bar dataKey="Gastado" fill="#ef4444" />
                <Bar dataKey="Disponible" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gastos por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} dataKey="monto" nameKey="categoria" cx="50%" cy="50%" outerRadius={100}>
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${value}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Proyectos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proyecto</TableHead>
                <TableHead>Presupuesto</TableHead>
                <TableHead>Gastado</TableHead>
                <TableHead>Disponible</TableHead>
                <TableHead>% Utilizado</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proyectos.map(p => {
                const proyectoItems = items.filter(i => i.proyecto === p)
                const proyectoPresupuestado = proyectoItems.reduce((sum, i) => sum + i.presupuestado, 0)
                const proyectoGastado = proyectoItems.reduce((sum, i) => sum + i.gastado, 0)
                const proyectoDisponible = proyectoPresupuestado - proyectoGastado
                const proyectoPorcentajeUtilizado = ((proyectoGastado / proyectoPresupuestado) * 100)
                const proyectoEstado = proyectoPorcentajeUtilizado > 80 ? 'En Riesgo' : 'Normal'
                return (
                  <TableRow key={p}>
                    <TableCell className="font-medium">{p}</TableCell>
                    <TableCell>${(proyectoPresupuestado / 1000).toFixed(0)}k</TableCell>
                    <TableCell className="text-orange-600">${(proyectoGastado / 1000).toFixed(0)}k</TableCell>
                    <TableCell className="text-green-600">${(proyectoDisponible / 1000).toFixed(0)}k</TableCell>
                    <TableCell>
                      <div className="w-24 bg-muted rounded h-2">
                        <div className="bg-primary h-2 rounded" style={{ width: `${proyectoPorcentajeUtilizado}%` }}></div>
                      </div>
                      <span className="text-xs text-muted-foreground ml-1">{proyectoPorcentajeUtilizado.toFixed(1)}%</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={proyectoEstado === 'En Riesgo' ? 'destructive' : 'default'}>
                        {proyectoEstado}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Gasto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Proyecto</label>
              <Input placeholder="Seleccionar proyecto" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Categoría</label>
              <Input placeholder="Materiales, Mano de Obra, etc" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Monto</label>
              <Input type="number" placeholder="0.00" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
            <Button onClick={() => setIsFormOpen(false)}>Guardar Gasto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PresupuestosPage
