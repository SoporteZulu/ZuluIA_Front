'use client'

import React, { useState } from 'react'
import { Plus, Search, Edit, Trash2, Eye, Save, X, AlertTriangle, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { useEntidades, useProcedimientos, useObras } from '@/lib/hooks/useProyectos'
import type { Entidad, Procedimiento, Obra } from '@/lib/proyectos-types'

const ObrasPage = () => {
  const { entidades, createEntidad, updateEntidad, deleteEntidad } = useEntidades()
  const { procedimientos } = useProcedimientos()
  const { obras, createObra, updateObra, deleteObra } = useObras()
  
  const [activeTab, setActiveTab] = useState<'entidades' | 'procedimientos' | 'obras'>('obras')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Entidades State
  const [entidadFormOpen, setEntidadFormOpen] = useState(false)
  const [editingEntidad, setEditingEntidad] = useState<Entidad | null>(null)
  const [entidadForm, setEntidadForm] = useState({
    nombre: '',
    tipo: 'Público' as const,
    cuitCuil: '',
    direccion: '',
    telefono: '',
    email: '',
    personaContacto: '',
    cargoContacto: '',
    estado: 'Activo' as const,
    notas: '',
  })
  
  // Procedimientos State
  const [procedFormOpen, setProcedFormOpen] = useState(false)
  const [editingProced, setEditingProced] = useState<Procedimiento | null>(null)
  
  // Obras State
  const [obraFormOpen, setObraFormOpen] = useState(false)
  const [editingObra, setEditingObra] = useState<Obra | null>(null)
  const [detailObraOpen, setDetailObraOpen] = useState(false)
  const [selectedObra, setSelectedObra] = useState<Obra | null>(null)

  return (
    <div className="flex-1 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Módulo de Obras</h1>
          <p className="text-muted-foreground mt-1">Gestión de obras, licitaciones y procedimientos</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="obras">Obras (7)</TabsTrigger>
          <TabsTrigger value="procedimientos">Procedimientos (6)</TabsTrigger>
          <TabsTrigger value="entidades">Entidades (8)</TabsTrigger>
        </TabsList>

        {/* OBRAS TAB */}
        <TabsContent value="obras" className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar obras..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <Button onClick={() => setObraFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Obra
            </Button>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Seguimiento de Obras</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {obras.map((obra) => (
                  <div key={obra.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{obra.nombre}</h3>
                        <p className="text-sm text-muted-foreground">{obra.ubicacion}</p>
                      </div>
                      <Badge variant={obra.estado === 'En Ejecución' ? 'default' : 'secondary'}>
                        {obra.estado}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground block mb-1">Avance Físico</span>
                        <div className="space-y-1">
                          <Progress value={obra.avanceFisico} className="h-2" />
                          <p className="text-xs font-medium">{obra.avanceFisico}%</p>
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-1">Avance Financiero</span>
                        <div className="space-y-1">
                          <Progress value={obra.avanceFinanciero} className="h-2" />
                          <p className="text-xs font-medium">{obra.avanceFinanciero}%</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs bg-muted/50 p-2 rounded">
                      <div>
                        <span className="text-muted-foreground">Presupuesto</span>
                        <p className="font-semibold">${obra.presupuestoOficial.toLocaleString('es-AR')}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Ejecutado</span>
                        <p className="font-semibold">${obra.montoEjecutado.toLocaleString('es-AR')}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Diferencia</span>
                        <p className="font-semibold text-orange-600">
                          ${(obra.presupuestoOficial - obra.montoEjecutado).toLocaleString('es-AR')}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => {
                        setSelectedObra(obra)
                        setDetailObraOpen(true)
                      }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingObra(obra)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={async () => await deleteObra(obra.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROCEDIMIENTOS TAB */}
        <TabsContent value="procedimientos" className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar procedimientos..." className="max-w-xs" />
            </div>
            <Button onClick={() => setProcedFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Procedimiento
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Expediente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Objeto</TableHead>
                    <TableHead>Monto Estimado</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {procedimientos.map((proc) => (
                    <TableRow key={proc.id}>
                      <TableCell className="font-mono text-sm">{proc.numeroExpediente}</TableCell>
                      <TableCell>{proc.tipo}</TableCell>
                      <TableCell>{proc.objeto}</TableCell>
                      <TableCell>${proc.montoEstimado.toLocaleString('es-AR')}</TableCell>
                      <TableCell>
                        <Badge variant={proc.estado === 'Adjudicado' ? 'default' : 'secondary'}>
                          {proc.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ENTIDADES TAB */}
        <TabsContent value="entidades" className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar entidades..." className="max-w-xs" />
            </div>
            <Button onClick={() => {
              setEditingEntidad(null)
              setEntidadFormOpen(true)
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Entidad
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entidades.map((ent) => (
                    <TableRow key={ent.id}>
                      <TableCell className="font-medium">{ent.nombre}</TableCell>
                      <TableCell>{ent.tipo}</TableCell>
                      <TableCell className="text-sm">{ent.email}</TableCell>
                      <TableCell className="text-sm">{ent.personaContacto}</TableCell>
                      <TableCell>
                        <Badge variant={ent.estado === 'Activo' ? 'default' : 'secondary'}>
                          {ent.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right gap-1 flex justify-end">
                        <Button size="sm" variant="ghost" onClick={() => {
                          setEditingEntidad(ent)
                          setEntidadFormOpen(true)
                        }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={async () => await deleteEntidad(ent.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Entidad Dialog */}
      <Dialog open={entidadFormOpen} onOpenChange={setEntidadFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingEntidad ? 'Editar Entidad' : 'Nueva Entidad'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={entidadForm.nombre} onChange={(e) => setEntidadForm({...entidadForm, nombre: e.target.value})} placeholder="Nombre de la entidad" />
            </div>
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={entidadForm.tipo} onValueChange={(v) => setEntidadForm({...entidadForm, tipo: v as any})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Público">Público</SelectItem>
                  <SelectItem value="Privado">Privado</SelectItem>
                  <SelectItem value="Mixto">Mixto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>CUIT/CUIL</Label>
              <Input value={entidadForm.cuitCuil} onChange={(e) => setEntidadForm({...entidadForm, cuitCuil: e.target.value})} placeholder="30-12345678-9" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={entidadForm.email} onChange={(e) => setEntidadForm({...entidadForm, email: e.target.value})} type="email" placeholder="email@entidad.com" />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Dirección</Label>
              <Input value={entidadForm.direccion} onChange={(e) => setEntidadForm({...entidadForm, direccion: e.target.value})} placeholder="Dirección completa" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntidadFormOpen(false)}>Cancelar</Button>
            <Button onClick={() => {
              if (editingEntidad) {
                updateEntidad(editingEntidad.id, entidadForm).then(() => setEntidadFormOpen(false))
              } else {
                createEntidad(entidadForm).then(() => setEntidadFormOpen(false))
              }
            }}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Obra Dialog */}
      <Dialog open={detailObraOpen} onOpenChange={setDetailObraOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {selectedObra?.nombre}
            </DialogTitle>
          </DialogHeader>
          {selectedObra && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Avance Físico</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-blue-600">{selectedObra.avanceFisico}%</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Avance Financiero</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-purple-600">{selectedObra.avanceFinanciero}%</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ObrasPage
