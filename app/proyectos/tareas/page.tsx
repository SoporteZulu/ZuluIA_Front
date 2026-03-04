'use client'

import React, { useState } from 'react'
import { Plus, Search, Filter, Trash2, Edit, CheckCircle2, AlertCircle, Clock, User, X, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface Tarea {
  id: string
  titulo: string
  descripcion: string
  proyecto: string
  status: 'Pendiente' | 'En Progreso' | 'En Revisión' | 'Completada'
  prioridad: 'Baja' | 'Media' | 'Alta' | 'Crítica'
  asignado: string
  fechaVencimiento: string
  progreso: number
  subtareas?: { id: string; titulo: string; completada: boolean }[]
}

const TareasPage = () => {
  const [tareas, setTareas] = useState<Tarea[]>([
    {
      id: '1',
      titulo: 'Diseño de planos',
      descripcion: 'Crear planos arquitectónicos del proyecto',
      proyecto: 'Proyecto A',
      status: 'En Progreso',
      prioridad: 'Alta',
      asignado: 'Juan García',
      fechaVencimiento: '2026-02-15',
      progreso: 65,
      subtareas: [
        { id: '1a', titulo: 'Levantamiento de datos', completada: true },
        { id: '1b', titulo: 'Dibujo de planos', completada: true },
        { id: '1c', titulo: 'Revisión', completada: false },
      ],
    },
    {
      id: '2',
      titulo: 'Aprobación regulatoria',
      descripcion: 'Obtener aprobación de autoridades',
      proyecto: 'Proyecto B',
      status: 'Pendiente',
      prioridad: 'Crítica',
      asignado: 'María López',
      fechaVencimiento: '2026-02-20',
      progreso: 0,
    },
    {
      id: '3',
      titulo: 'Compra de materiales',
      descripcion: 'Adquisición de insumos necesarios',
      proyecto: 'Proyecto A',
      status: 'En Progreso',
      prioridad: 'Media',
      asignado: 'Carlos Rodríguez',
      fechaVencimiento: '2026-02-25',
      progreso: 40,
    },
  ])

  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [filterPriority, setFilterPriority] = useState('todos')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTarea, setEditingTarea] = useState<Tarea | null>(null)
  const [formData, setFormData] = useState<Partial<Tarea>>({})

  const statuses = ['Pendiente', 'En Progreso', 'En Revisión', 'Completada']
  const priorities = ['Baja', 'Media', 'Alta', 'Crítica']
  const proyectos = ['Proyecto A', 'Proyecto B', 'Proyecto C']
  const miembros = ['Juan García', 'María López', 'Carlos Rodríguez', 'Ana Martínez']

  const handleOpenForm = (tarea?: Tarea) => {
    if (tarea) {
      setEditingTarea(tarea)
      setFormData(tarea)
    } else {
      setEditingTarea(null)
      setFormData({
        status: 'Pendiente',
        prioridad: 'Media',
        progreso: 0,
      })
    }
    setIsFormOpen(true)
  }

  const handleSaveTarea = () => {
    if (!formData.titulo || !formData.proyecto || !formData.asignado) return

    if (editingTarea) {
      setTareas(tareas.map(t => t.id === editingTarea.id ? { ...editingTarea, ...formData } as Tarea : t))
    } else {
      setTareas([...tareas, {
        id: `tarea-${Date.now()}`,
        titulo: formData.titulo || '',
        descripcion: formData.descripcion || '',
        proyecto: formData.proyecto || '',
        status: (formData.status as any) || 'Pendiente',
        prioridad: (formData.prioridad as any) || 'Media',
        asignado: formData.asignado || '',
        fechaVencimiento: formData.fechaVencimiento || '',
        progreso: formData.progreso || 0,
      }])
    }
    setIsFormOpen(false)
  }

  const handleDeleteTarea = (id: string) => {
    setTareas(tareas.filter(t => t.id !== id))
  }

  const handleChangeStatus = (id: string, nuevoStatus: typeof statuses[number]) => {
    setTareas(tareas.map(t => t.id === id ? { ...t, status: nuevoStatus as any } : t))
  }

  const handleChangeProgress = (id: string, newProgress: number) => {
    setTareas(tareas.map(t => t.id === id ? { ...t, progreso: newProgress } : t))
  }

  const filteredTareas = tareas.filter(t => {
    const matchSearch = t.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
    const matchStatus = filterStatus === 'todos' || t.status === filterStatus
    const matchPriority = filterPriority === 'todos' || t.prioridad === filterPriority
    return matchSearch && matchStatus && matchPriority
  })

  const kanbanBoard = statuses.reduce((acc, status) => {
    acc[status] = filteredTareas.filter(t => t.status === status)
    return acc
  }, {} as Record<string, Tarea[]>)

  const getPriorityColor = (prioridad: string) => {
    switch (prioridad) {
      case 'Crítica':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'Alta':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'Media':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'Baja':
        return 'bg-green-100 text-green-800 border-green-300'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tareas</h1>
          <p className="text-muted-foreground mt-1">Gestiona tareas de proyectos con Kanban</p>
        </div>
        <Button onClick={() => handleOpenForm()}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Tarea
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar tareas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            {priorities.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {statuses.map(status => (
          <Card key={status} className="bg-muted/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{status}</CardTitle>
              <p className="text-xs text-muted-foreground">{kanbanBoard[status].length} tareas</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {kanbanBoard[status].map(tarea => (
                <Card key={tarea.id} className="p-3 cursor-move hover:shadow-md transition bg-background border-l-4 border-l-purple-500">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{tarea.titulo}</p>
                        <p className="text-xs text-muted-foreground mt-1">{tarea.proyecto}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleOpenForm(tarea)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleDeleteTarea(tarea.id)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <Badge className={getPriorityColor(tarea.prioridad)}>
                        {tarea.prioridad}
                      </Badge>
                    </div>

                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {tarea.asignado}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {tarea.fechaVencimiento}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Progreso</span>
                        <span>{tarea.progreso}%</span>
                      </div>
                      <div className="w-full bg-muted rounded h-2">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded transition-all"
                          style={{ width: `${tarea.progreso}%` }}
                        ></div>
                      </div>
                    </div>

                    {tarea.subtareas && tarea.subtareas.length > 0 && (
                      <div className="text-xs border-t pt-2">
                        <p className="text-muted-foreground mb-1">Subtareas:</p>
                        {tarea.subtareas.map(sub => (
                          <div key={sub.id} className="flex items-center gap-1">
                            {sub.completada ? (
                              <CheckCircle2 className="h-3 w-3 text-green-600" />
                            ) : (
                              <AlertCircle className="h-3 w-3 text-orange-600" />
                            )}
                            <span className={sub.completada ? 'line-through text-muted-foreground' : ''}>
                              {sub.titulo}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTarea ? 'Editar Tarea' : 'Nueva Tarea'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input
                  placeholder="Título de la tarea"
                  value={formData.titulo || ''}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Proyecto *</Label>
                <Select value={formData.proyecto || ''} onValueChange={(value) => setFormData({ ...formData, proyecto: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {proyectos.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                placeholder="Descripción detallada"
                value={formData.descripcion || ''}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={formData.status || 'Pendiente'} onValueChange={(value) => setFormData({ ...formData, status: value as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select value={formData.prioridad || 'Media'} onValueChange={(value) => setFormData({ ...formData, prioridad: value as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Asignado a *</Label>
                <Select value={formData.asignado || ''} onValueChange={(value) => setFormData({ ...formData, asignado: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {miembros.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha de Vencimiento</Label>
                <Input
                  type="date"
                  value={formData.fechaVencimiento || ''}
                  onChange={(e) => setFormData({ ...formData, fechaVencimiento: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Progreso: {formData.progreso || 0}%</Label>
              <input
                type="range"
                min="0"
                max="100"
                value={formData.progreso || 0}
                onChange={(e) => setFormData({ ...formData, progreso: Number.parseInt(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSaveTarea}>
              <Save className="h-4 w-4 mr-2" />
              Guardar Tarea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TareasPage
