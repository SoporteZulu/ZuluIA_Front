"use client"

import React from "react"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Plus, Search, MoreHorizontal, Pencil, Trash2, Users, Filter, Tag,
} from "lucide-react"
import { crmSegments as initialSegments } from "@/lib/crm-data"
import type { CRMSegment } from "@/lib/types"

const tipoLabels: Record<CRMSegment["tipoSegmento"], string> = {
  estatico: "Estático",
  dinamico: "Dinámico",
}

function SegmentosContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const action = searchParams.get("action")

  const [search, setSearch] = useState("")
  const [filterTipo, setFilterTipo] = useState<string>("all")
  const [isFormOpen, setIsFormOpen] = useState(action === "new")
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedSegment, setSelectedSegment] = useState<CRMSegment | null>(null)
  const [segments, setSegments] = useState(initialSegments)

  const emptyForm: Partial<CRMSegment> = {
    nombre: "",
    descripcion: "",
    tipoSegmento: "estatico",
    criterios: {},
    clientesIds: [],
  }

  const [formData, setFormData] = useState<Partial<CRMSegment>>(emptyForm)

  const stats = {
    total: segments.length,
    estaticos: segments.filter(s => s.tipoSegmento === "estatico").length,
    dinamicos: segments.filter(s => s.tipoSegmento === "dinamico").length,
    totalClientes: segments.reduce((sum, s) => sum + (s.clientesIds?.length || 0), 0),
  }

  const filteredSegments = segments.filter(segment => {
    const matchesSearch = segment.nombre.toLowerCase().includes(search.toLowerCase())
    const matchesTipo = filterTipo === "all" || segment.tipoSegmento === filterTipo
    return matchesSearch && matchesTipo
  })

  const getTipoColor = (tipo: CRMSegment["tipoSegmento"]) => {
    return tipo === "estatico" 
      ? "bg-slate-500/20 text-slate-400" 
      : "bg-blue-500/20 text-blue-400"
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: "numeric" }).format(date)
  }

  const openNewForm = () => {
    setSelectedSegment(null)
    setFormData(emptyForm)
    setIsFormOpen(true)
  }

  const handleEdit = (segment: CRMSegment) => {
    setSelectedSegment(segment)
    setFormData({ ...segment })
    setIsFormOpen(true)
  }

  const handleDelete = (segment: CRMSegment) => {
    setSelectedSegment(segment)
    setIsDeleteOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedSegment) {
      setSegments(segments.map(s => 
        s.id === selectedSegment.id ? { ...s, ...formData, updatedAt: new Date() } as CRMSegment : s
      ))
    } else {
      const newSegment: CRMSegment = {
        ...formData as CRMSegment,
        id: `seg-${Date.now()}`,
        clientesIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      setSegments([newSegment, ...segments])
    }
    closeForm()
  }

  const confirmDelete = () => {
    if (selectedSegment) {
      setSegments(segments.filter(s => s.id !== selectedSegment.id))
    }
    setIsDeleteOpen(false)
    setSelectedSegment(null)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setSelectedSegment(null)
    setFormData(emptyForm)
    router.push("/crm/segmentos")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Segmentos</h1>
          <p className="text-muted-foreground">Agrupación de clientes para campañas</p>
        </div>
        <Button onClick={openNewForm}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Segmento
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Tag className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Estáticos</p>
                <p className="text-2xl font-bold">{stats.estaticos}</p>
              </div>
              <Users className="h-8 w-8 text-slate-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Dinámicos</p>
                <p className="text-2xl font-bold text-blue-500">{stats.dinamicos}</p>
              </div>
              <Filter className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Clientes Totales</p>
                <p className="text-2xl font-bold text-emerald-500">{stats.totalClientes}</p>
              </div>
              <Users className="h-8 w-8 text-emerald-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar segmentos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(tipoLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Segmento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Clientes</TableHead>
                <TableHead>Última Actualización</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSegments.map((segment) => (
                <TableRow key={segment.id} className="group">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Tag className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{segment.nombre}</p>
                        {segment.descripcion && (
                          <p className="text-sm text-muted-foreground line-clamp-1">{segment.descripcion}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getTipoColor(segment.tipoSegmento)}>
                      {tipoLabels[segment.tipoSegmento]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {segment.clientesIds?.length || 0}
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(segment.updatedAt)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(segment)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDelete(segment)} className="text-red-500">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredSegments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No se encontraron segmentos
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedSegment ? "Editar Segmento" : "Nuevo Segmento"}</DialogTitle>
            <DialogDescription>
              {selectedSegment ? "Modifica los datos" : "Crea un nuevo segmento de clientes"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Segmento</Label>
                <Select
                  value={formData.tipoSegmento}
                  onValueChange={(value) => setFormData({ ...formData, tipoSegmento: value as CRMSegment["tipoSegmento"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(tipoLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {formData.tipoSegmento === "estatico" 
                    ? "Los clientes se agregan manualmente"
                    : "Los clientes se agregan automáticamente según criterios"}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button>
              <Button type="submit">{selectedSegment ? "Guardar" : "Crear"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar segmento?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar "{selectedSegment?.nombre}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function SegmentosPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-muted-foreground">Cargando...</div>}>
      <SegmentosContent />
    </Suspense>
  )
}

// loading.tsx
// export default function Loading() {
//   return null
// }
