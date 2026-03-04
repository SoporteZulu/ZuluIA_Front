"use client"

import React, { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Plus, Edit, Trash2, Clock, AlertTriangle, CheckCircle, Timer } from "lucide-react"
import { slas as hdSLAs } from "@/lib/shared-data"
import type { HDSLA } from "@/lib/types"

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}min`
}

function SLAsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [slas, setSLAs] = useState<HDSLA[]>(hdSLAs)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingSLA, setEditingSLA] = useState<HDSLA | null>(null)

  const [formData, setFormData] = useState<Partial<HDSLA>>({
    nombre: "",
    descripcion: "",
    tipoCliente: "estandar",
    tiempoRespuesta: 60,
    tiempoResolucion: 480,
    horasOperacion: { inicio: "09:00", fin: "18:00" },
    aplicaFinesSemana: false,
    prioridadCriticaMultiplier: 0.5,
    prioridadAltaMultiplier: 0.75,
    prioridadMediaMultiplier: 1,
    prioridadBajaMultiplier: 1.5,
    estado: "activo",
  })

  const stats = {
    total: slas.length,
    activos: slas.filter(s => s.estado === "activo").length,
    inactivos: slas.filter(s => s.estado === "inactivo").length,
  }

  const openForm = (sla?: HDSLA) => {
    if (sla) {
      setEditingSLA(sla)
      setFormData({ ...sla })
    } else {
      setEditingSLA(null)
      setFormData({
        nombre: "",
        descripcion: "",
        tipoCliente: "estandar",
        tiempoRespuesta: 60,
        tiempoResolucion: 480,
        horasOperacion: { inicio: "09:00", fin: "18:00" },
        aplicaFinesSemana: false,
        prioridadCriticaMultiplier: 0.5,
        prioridadAltaMultiplier: 0.75,
        prioridadMediaMultiplier: 1,
        prioridadBajaMultiplier: 1.5,
        estado: "activo",
      })
    }
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setEditingSLA(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingSLA) {
      setSLAs(slas.map(s => 
        s.id === editingSLA.id ? { ...s, ...formData, updatedAt: new Date() } as HDSLA : s
      ))
    } else {
      const newSLA: HDSLA = {
        ...formData as HDSLA,
        id: `sla-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      setSLAs([...slas, newSLA])
    }
    closeForm()
  }

  const handleDelete = (id: string) => {
    setSLAs(slas.filter(s => s.id !== id))
  }

  const tipoClienteLabels = {
    vip: "VIP",
    estandar: "Estandar",
    basico: "Basico",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Acuerdos de Nivel de Servicio (SLA)</h1>
          <p className="text-muted-foreground">Configura los tiempos de respuesta y resolucion</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo SLA
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSLA ? "Editar SLA" : "Nuevo SLA"}</DialogTitle>
              <DialogDescription>
                {editingSLA ? "Modifica la configuracion del SLA" : "Configura un nuevo acuerdo de nivel de servicio"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre del SLA</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                    placeholder="Ej: SLA Premium"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipoCliente">Tipo de Cliente</Label>
                  <Select
                    value={formData.tipoCliente}
                    onValueChange={(value) => setFormData({ ...formData, tipoCliente: value as HDSLA["tipoCliente"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="estandar">Estandar</SelectItem>
                      <SelectItem value="basico">Basico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripcion</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion || ""}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Tiempos Base (minutos)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tiempoRespuesta">Tiempo de Respuesta</Label>
                    <Input
                      id="tiempoRespuesta"
                      type="number"
                      value={formData.tiempoRespuesta}
                      onChange={(e) => setFormData({ ...formData, tiempoRespuesta: parseInt(e.target.value) })}
                      required
                      min={1}
                    />
                    <p className="text-xs text-muted-foreground">
                      = {formatMinutes(formData.tiempoRespuesta || 0)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tiempoResolucion">Tiempo de Resolucion</Label>
                    <Input
                      id="tiempoResolucion"
                      type="number"
                      value={formData.tiempoResolucion}
                      onChange={(e) => setFormData({ ...formData, tiempoResolucion: parseInt(e.target.value) })}
                      required
                      min={1}
                    />
                    <p className="text-xs text-muted-foreground">
                      = {formatMinutes(formData.tiempoResolucion || 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Horario de Operacion</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="horaInicio">Hora Inicio</Label>
                    <Input
                      id="horaInicio"
                      type="time"
                      value={formData.horasOperacion?.inicio || "09:00"}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        horasOperacion: { ...formData.horasOperacion!, inicio: e.target.value } 
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="horaFin">Hora Fin</Label>
                    <Input
                      id="horaFin"
                      type="time"
                      value={formData.horasOperacion?.fin || "18:00"}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        horasOperacion: { ...formData.horasOperacion!, fin: e.target.value } 
                      })}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="finesSemana"
                    checked={formData.aplicaFinesSemana}
                    onCheckedChange={(checked) => setFormData({ ...formData, aplicaFinesSemana: checked })}
                  />
                  <Label htmlFor="finesSemana">Aplica fines de semana</Label>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Multiplicadores por Prioridad</h4>
                <p className="text-sm text-muted-foreground">
                  Los tiempos base se multiplican por estos valores segun la prioridad del ticket
                </p>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="multCritica">Critica</Label>
                    <Input
                      id="multCritica"
                      type="number"
                      step="0.1"
                      value={formData.prioridadCriticaMultiplier}
                      onChange={(e) => setFormData({ ...formData, prioridadCriticaMultiplier: parseFloat(e.target.value) })}
                      min={0.1}
                      max={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="multAlta">Alta</Label>
                    <Input
                      id="multAlta"
                      type="number"
                      step="0.1"
                      value={formData.prioridadAltaMultiplier}
                      onChange={(e) => setFormData({ ...formData, prioridadAltaMultiplier: parseFloat(e.target.value) })}
                      min={0.1}
                      max={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="multMedia">Media</Label>
                    <Input
                      id="multMedia"
                      type="number"
                      step="0.1"
                      value={formData.prioridadMediaMultiplier}
                      onChange={(e) => setFormData({ ...formData, prioridadMediaMultiplier: parseFloat(e.target.value) })}
                      min={0.1}
                      max={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="multBaja">Baja</Label>
                    <Input
                      id="multBaja"
                      type="number"
                      step="0.1"
                      value={formData.prioridadBajaMultiplier}
                      onChange={(e) => setFormData({ ...formData, prioridadBajaMultiplier: parseFloat(e.target.value) })}
                      min={0.1}
                      max={5}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="estado"
                  checked={formData.estado === "activo"}
                  onCheckedChange={(checked) => setFormData({ ...formData, estado: checked ? "activo" : "inactivo" })}
                />
                <Label htmlFor="estado">SLA Activo</Label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button>
                <Button type="submit">{editingSLA ? "Guardar Cambios" : "Crear SLA"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total SLAs</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactivos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inactivos}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Configuracion de SLAs</CardTitle>
          <CardDescription>
            Define los acuerdos de nivel de servicio para diferentes tipos de clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo Cliente</TableHead>
                <TableHead>Tiempo Respuesta</TableHead>
                <TableHead>Tiempo Resolucion</TableHead>
                <TableHead>Horario</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slas.map((sla) => (
                <TableRow key={sla.id} className="group">
                  <TableCell>
                    <div>
                      <div className="font-medium">{sla.nombre}</div>
                      {sla.descripcion && (
                        <div className="text-sm text-muted-foreground">{sla.descripcion}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {sla.tipoCliente ? tipoClienteLabels[sla.tipoCliente] : "Todos"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Timer className="h-4 w-4 text-muted-foreground" />
                      {formatMinutes(sla.tiempoRespuesta)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {formatMinutes(sla.tiempoResolucion)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {sla.horasOperacion.inicio} - {sla.horasOperacion.fin}
                      {sla.aplicaFinesSemana && (
                        <span className="text-muted-foreground ml-1">(+fds)</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={sla.estado === "activo" ? "default" : "secondary"}>
                      {sla.estado === "activo" ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => openForm(sla)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Eliminar SLA</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta accion eliminara permanentemente el SLA "{sla.nombre}". Los clientes asignados quedaran sin SLA.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(sla.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SLAsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-muted-foreground">Cargando...</div>}>
      <SLAsContent />
    </Suspense>
  )
}
