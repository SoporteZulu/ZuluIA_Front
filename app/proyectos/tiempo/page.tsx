'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Clock, Play, Pause, Save, X, Edit, Trash2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface Registro {
  id: string
  empleado: string
  proyecto: string
  tarea: string
  fecha: string
  horas: number
  minutos: number
  estado: 'Completado' | 'En Progreso'
}

const TiempoPage = () => {
  const [registros, setRegistros] = useState<Registro[]>([
    {
      id: '1',
      empleado: 'Juan García',
      proyecto: 'Proyecto A',
      tarea: 'Diseño de planos',
      fecha: '2026-02-06',
      horas: 8,
      minutos: 0,
      estado: 'Completado',
    },
    {
      id: '2',
      empleado: 'María López',
      proyecto: 'Proyecto B',
      tarea: 'Supervisión',
      fecha: '2026-02-06',
      horas: 6,
      minutos: 30,
      estado: 'Completado',
    },
    {
      id: '3',
      empleado: 'Carlos Rodríguez',
      proyecto: 'Proyecto A',
      tarea: 'Compra de materiales',
      fecha: '2026-02-06',
      horas: 4,
      minutos: 15,
      estado: 'En Progreso',
    },
  ])

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingRegistro, setEditingRegistro] = useState<Registro | null>(null)
  const [formData, setFormData] = useState<Partial<Registro>>({})
  const [timerActive, setTimerActive] = useState<string | null>(null)
  const [timerSeconds, setTimerSeconds] = useState(0)

  const empleados = ['Juan García', 'María López', 'Carlos Rodríguez', 'Ana Martínez']
  const proyectos = ['Proyecto A', 'Proyecto B', 'Proyecto C']
  const tareas = ['Diseño de planos', 'Supervisión', 'Compra de materiales', 'Instalación', 'Inspección']

  const handleOpenForm = (registro?: Registro) => {
    if (registro) {
      setEditingRegistro(registro)
      setFormData(registro)
    } else {
      setEditingRegistro(null)
      setFormData({
        estado: 'En Progreso',
        horas: 0,
        minutos: 0,
        fecha: new Date().toISOString().split('T')[0],
      })
    }
    setTimerActive(null)
    setTimerSeconds(0)
    setIsFormOpen(true)
  }

  const handleSaveRegistro = () => {
    if (!formData.empleado || !formData.proyecto || !formData.tarea) return

    if (editingRegistro) {
      setRegistros(registros.map(r => r.id === editingRegistro.id ? { ...editingRegistro, ...formData } as Registro : r))
    } else {
      setRegistros([...registros, {
        id: `registro-${Date.now()}`,
        empleado: formData.empleado || '',
        proyecto: formData.proyecto || '',
        tarea: formData.tarea || '',
        fecha: formData.fecha || new Date().toISOString().split('T')[0],
        horas: formData.horas || 0,
        minutos: formData.minutos || 0,
        estado: (formData.estado as any) || 'En Progreso',
      }])
    }
    setIsFormOpen(false)
  }

  const handleDeleteRegistro = (id: string) => {
    setRegistros(registros.filter(r => r.id !== id))
  }

  const handleStartTimer = () => {
    setTimerActive(editingRegistro?.id || 'new')
  }

  const handleStopTimer = () => {
    setTimerActive(null)
  }

  const handleSaveTimer = () => {
    const horas = Math.floor(timerSeconds / 3600)
    const minutos = Math.floor((timerSeconds % 3600) / 60)
    setFormData({ ...formData, horas, minutos })
    setTimerActive(null)
    setTimerSeconds(0)
  }

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (timerActive) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [timerActive])

  const totalHoras = registros.reduce((sum, r) => sum + r.horas + r.minutos / 60, 0)

  const horasPorEmpleado = empleados.map(e => ({
    empleado: e,
    horas: Number((registros.filter(r => r.empleado === e).reduce((sum, r) => sum + r.horas + r.minutos / 60, 0)).toFixed(1)),
  }))

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Registro de Tiempo</h1>
          <p className="text-muted-foreground mt-1">Gestiona horas trabajadas y tiempo del equipo</p>
        </div>
        <Button onClick={() => handleOpenForm()}>
          <Plus className="h-4 w-4 mr-2" />
          Registrar Tiempo
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Horas Semana</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">{totalHoras.toFixed(1)} hrs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Empleados Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{registros.length}</p>
            <p className="text-xs text-muted-foreground mt-1">En el equipo</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Promedio Diario</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600">{registros.length > 0 ? (totalHoras / registros.length).toFixed(1) : '0.0'} hrs</p>
            <p className="text-xs text-muted-foreground mt-1">Horas por persona</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Tareas Completadas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">{registros.filter(r => r.estado === 'Completado').length}</p>
            <p className="text-xs text-muted-foreground mt-1">De {registros.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Horas por Empleado (Semana)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={horasPorEmpleado}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="empleado" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="horas" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timer Rápido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-6 bg-muted rounded-lg text-center">
              <p className="text-5xl font-bold text-blue-600 font-mono">{formatTime(timerSeconds)}</p>
              <p className="text-sm text-muted-foreground mt-2">Tiempo en curso</p>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1 bg-transparent" variant="outline" size="lg" onClick={handleStartTimer}>
                <Play className="h-4 w-4 mr-2" />
                Iniciar
              </Button>
              <Button className="flex-1 bg-transparent" variant="outline" size="lg" onClick={handleStopTimer}>
                <Pause className="h-4 w-4 mr-2" />
                Pausar
              </Button>
            </div>
            <Button className="w-full" size="lg" onClick={handleSaveTimer}>
              <Save className="h-4 w-4 mr-2" />
              Guardar
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registros Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Proyecto</TableHead>
                <TableHead>Tarea</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Horas</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registros.map(registro => (
                <TableRow key={registro.id}>
                  <TableCell className="font-medium">{registro.empleado}</TableCell>
                  <TableCell>{registro.proyecto}</TableCell>
                  <TableCell>{registro.tarea}</TableCell>
                  <TableCell>{registro.fecha}</TableCell>
                  <TableCell>{registro.horas} horas</TableCell>
                  <TableCell>
                    <Badge variant={registro.estado === 'Completado' ? 'default' : 'outline'}>
                      {registro.estado}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRegistro ? 'Editar Registro' : 'Nuevo Registro de Tiempo'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Empleado *</Label>
                <Select value={formData.empleado || ''} onValueChange={(value) => setFormData({ ...formData, empleado: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {empleados.map(e => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Proyecto *</Label>
                <Select value={formData.proyecto || ''} onValueChange={(value) => setFormData({ ...formData, proyecto: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {proyectos.map(p => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tarea *</Label>
              <Select value={formData.tarea || ''} onValueChange={(value) => setFormData({ ...formData, tarea: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tareas.map(t => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={formData.fecha || ''}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={formData.estado || 'En Progreso'} onValueChange={(value) => setFormData({ ...formData, estado: value as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="En Progreso">En Progreso</SelectItem>
                    <SelectItem value="Completado">Completado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tiempo</Label>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-center bg-muted p-4 rounded text-xl">
                    {timerActive ? formatTime(timerSeconds) : `${formData.horas || 0}h ${formData.minutos || 0}m`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-center">
                {!timerActive ? (
                  <Button onClick={handleStartTimer} className="flex-1">
                    <Play className="h-4 w-4 mr-2" />
                    Iniciar Cronómetro
                  </Button>
                ) : (
                  <>
                    <Button onClick={handleStopTimer} variant="outline" className="flex-1 bg-transparent">
                      <Pause className="h-4 w-4 mr-2" />
                      Pausar
                    </Button>
                    <Button onClick={handleSaveTimer} className="flex-1">
                      <Save className="h-4 w-4 mr-2" />
                      Guardar Tiempo
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Horas</Label>
                <Input
                  type="number"
                  min="0"
                  max="24"
                  value={formData.horas || ''}
                  onChange={(e) => setFormData({ ...formData, horas: Number.parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Minutos</Label>
                <Input
                  type="number"
                  min="0"
                  max="59"
                  value={formData.minutos || ''}
                  onChange={(e) => setFormData({ ...formData, minutos: Number.parseInt(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSaveRegistro}>
              <Save className="h-4 w-4 mr-2" />
              Guardar Registro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TiempoPage
