'use client'

import React, { useState } from 'react'
import { Plus, Search, Edit, Trash2, Mail, Phone, Briefcase, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Miembro {
  id: string
  nombre: string
  rol: string
  email: string
  telefono: string
  proyectos: string[]
  habilidades: string[]
  disponibilidad: number
  costo_horario: number
}

const EquipoPage = () => {
  const [miembros, setMiembros] = useState<Miembro[]>([
    {
      id: '1',
      nombre: 'Juan García',
      rol: 'Ingeniero',
      email: 'juan@empresa.com',
      telefono: '555-0101',
      proyectos: ['Proyecto A', 'Proyecto B'],
      habilidades: ['CAD', 'Proyecto', 'Liderazgo'],
      disponibilidad: 100,
      costo_horario: 150,
    },
    {
      id: '2',
      nombre: 'María López',
      rol: 'Supervisor',
      email: 'maria@empresa.com',
      telefono: '555-0102',
      proyectos: ['Proyecto B', 'Proyecto C'],
      habilidades: ['Supervisión', 'Comunicación'],
      disponibilidad: 75,
      costo_horario: 120,
    },
    {
      id: '3',
      nombre: 'Carlos Rodríguez',
      rol: 'Técnico',
      email: 'carlos@empresa.com',
      telefono: '555-0103',
      proyectos: ['Proyecto A'],
      habilidades: ['Materiales', 'Compras', 'Logística'],
      disponibilidad: 90,
      costo_horario: 80,
    },
  ])

  const [searchTerm, setSearchTerm] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<Miembro | null>(null)
  const [formData, setFormData] = useState<Partial<Miembro>>({})
  const [viewMode, setViewMode] = useState<'tabla' | 'tarjetas'>('tabla')

  const roles = ['Ingeniero', 'Supervisor', 'Técnico', 'Administrador', 'Coordinador', 'Otros']
  const proyectos = ['Proyecto A', 'Proyecto B', 'Proyecto C']
  const habilidadesList = ['CAD', 'Proyecto', 'Liderazgo', 'Supervisión', 'Comunicación', 'Materiales', 'Compras', 'Logística']

  const handleOpenForm = (miembro?: Miembro) => {
    if (miembro) {
      setEditingMember(miembro)
      setFormData(miembro)
    } else {
      setEditingMember(null)
      setFormData({
        rol: 'Técnico',
        disponibilidad: 100,
        costo_horario: 100,
        proyectos: [],
        habilidades: [],
      })
    }
    setIsFormOpen(true)
  }

  const handleSaveMiembro = () => {
    if (!formData.nombre || !formData.email || !formData.rol) return

    if (editingMember) {
      setMiembros(miembros.map(m => m.id === editingMember.id ? { ...editingMember, ...formData } as Miembro : m))
    } else {
      setMiembros([...miembros, {
        id: `miembro-${Date.now()}`,
        nombre: formData.nombre || '',
        rol: formData.rol || '',
        email: formData.email || '',
        telefono: formData.telefono || '',
        proyectos: formData.proyectos || [],
        habilidades: formData.habilidades || [],
        disponibilidad: formData.disponibilidad || 100,
        costo_horario: formData.costo_horario || 100,
      }])
    }
    setIsFormOpen(false)
  }

  const handleDeleteMiembro = (id: string) => {
    setMiembros(miembros.filter(m => m.id !== id))
  }

  const filteredMiembros = miembros.filter(m =>
    m.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.rol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Equipo y Recursos</h1>
          <p className="text-muted-foreground mt-1">Gestiona miembros del equipo y asignaciones</p>
        </div>
        <Button onClick={() => handleOpenForm()}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Miembro
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar miembros..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)} className="w-full">
        <TabsList>
          <TabsTrigger value="tabla">Tabla</TabsTrigger>
          <TabsTrigger value="tarjetas">Tarjetas</TabsTrigger>
        </TabsList>

        <TabsContent value="tabla" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Disponibilidad</TableHead>
                  <TableHead>Proyectos</TableHead>
                  <TableHead>Habilidades</TableHead>
                  <TableHead>$/Hora</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMiembros.map(miembro => (
                  <TableRow key={miembro.id}>
                    <TableCell className="font-medium">{miembro.nombre}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{miembro.rol}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{miembro.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-muted rounded h-2">
                          <div
                            className="bg-green-500 h-2 rounded"
                            style={{ width: `${miembro.disponibilidad}%` }}
                          ></div>
                        </div>
                        <span className="text-xs">{miembro.disponibilidad}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm max-w-xs">
                      <div className="flex gap-1 flex-wrap">
                        {miembro.proyectos.map(p => (
                          <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm max-w-xs">
                      <div className="flex gap-1 flex-wrap">
                        {miembro.habilidades.map(h => (
                          <Badge key={h} variant="outline" className="text-xs">{h}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">${miembro.costo_horario}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenForm(miembro)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteMiembro(miembro.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="tarjetas" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMiembros.map(miembro => (
              <Card key={miembro.id} className="hover:shadow-lg transition">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{miembro.nombre}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{miembro.rol}</p>
                    </div>
                    <Briefcase className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${miembro.email}`} className="hover:underline break-all">
                        {miembro.email}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${miembro.telefono}`} className="hover:underline">
                        {miembro.telefono}
                      </a>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Disponibilidad</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-muted rounded h-2">
                        <div
                          className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded"
                          style={{ width: `${miembro.disponibilidad}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-semibold">{miembro.disponibilidad}%</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Habilidades</p>
                    <div className="flex gap-1 flex-wrap">
                      {miembro.habilidades.map(skill => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Proyectos Asignados</p>
                    <div className="space-y-1">
                      {miembro.proyectos.map(p => (
                        <Badge key={p} variant="outline" className="text-xs block w-full text-center">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">Costo Horario</p>
                    <p className="text-lg font-bold text-purple-600">${miembro.costo_horario}/hr</p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-transparent"
                      onClick={() => handleOpenForm(miembro)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-transparent"
                      onClick={() => handleDeleteMiembro(miembro.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Eliminar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingMember ? 'Editar Miembro' : 'Nuevo Miembro del Equipo'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre Completo *</Label>
                <Input
                  placeholder="Nombre completo"
                  value={formData.nombre || ''}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Rol *</Label>
                <Select value={formData.rol || ''} onValueChange={(value) => setFormData({ ...formData, rol: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(role => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  placeholder="email@empresa.com"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  placeholder="+54 9 11..."
                  value={formData.telefono || ''}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Disponibilidad: {formData.disponibilidad || 100}%</Label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.disponibilidad || 100}
                  onChange={(e) => setFormData({ ...formData, disponibilidad: Number.parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label>Costo Horario ($)</Label>
                <Input
                  type="number"
                  placeholder="100"
                  value={formData.costo_horario || ''}
                  onChange={(e) => setFormData({ ...formData, costo_horario: Number.parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Proyectos Asignados</Label>
              <div className="space-y-2">
                {proyectos.map(p => (
                  <label key={p} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.proyectos?.includes(p) || false}
                      onChange={(e) => {
                        const nuevos = e.target.checked
                          ? [...(formData.proyectos || []), p]
                          : (formData.proyectos || []).filter(x => x !== p)
                        setFormData({ ...formData, proyectos: nuevos })
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{p}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Habilidades</Label>
              <div className="grid grid-cols-2 gap-2">
                {habilidadesList.map(h => (
                  <label key={h} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.habilidades?.includes(h) || false}
                      onChange={(e) => {
                        const nuevas = e.target.checked
                          ? [...(formData.habilidades || []), h]
                          : (formData.habilidades || []).filter(x => x !== h)
                        setFormData({ ...formData, habilidades: nuevas })
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{h}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSaveMiembro}>
              <Save className="h-4 w-4 mr-2" />
              Guardar Miembro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default EquipoPage
