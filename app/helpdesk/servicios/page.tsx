"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, Search, MoreHorizontal, Edit, Trash2, Clock, DollarSign, X } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { servicios as initialServicios, categoriasServicio } from "@/lib/shared-data"
import type { HDServicio } from "@/lib/types"
import Loading from "@/components/ui/loading" // Declare the Loading variable

const tipoPrecioLabels: Record<string, string> = {
  fijo: "Precio Fijo",
  por_hora: "Por Hora",
  por_proyecto: "Por Proyecto",
  escalonado: "Escalonado",
}

function ServiciosContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [serviciosList, setServiciosList] = useState<HDServicio[]>(initialServicios)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategoria, setFilterCategoria] = useState<string>("todos")
  const [filterEstado, setFilterEstado] = useState<string>("todos")
  const [isFormOpen, setIsFormOpen] = useState(searchParams.get("action") === "new")
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedServicio, setSelectedServicio] = useState<HDServicio | null>(null)
  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
    categoriaId: "",
    duracionEstimada: 60,
    precioBase: 0,
    tipoPrecio: "fijo" as HDServicio["tipoPrecio"],
    garantiaDias: 0,
    condiciones: "",
    estado: "activo" as HDServicio["estado"],
  })

  const filteredServicios = serviciosList.filter((servicio) => {
    const matchesSearch =
      servicio.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      servicio.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategoria = filterCategoria === "todos" || servicio.categoriaId === filterCategoria
    const matchesEstado = filterEstado === "todos" || servicio.estado === filterEstado
    return matchesSearch && matchesCategoria && matchesEstado
  })

  const openForm = (servicio?: HDServicio) => {
    if (servicio) {
      setSelectedServicio(servicio)
      setFormData({
        codigo: servicio.codigo,
        nombre: servicio.nombre,
        descripcion: servicio.descripcion || "",
        categoriaId: servicio.categoriaId,
        duracionEstimada: servicio.duracionEstimada,
        precioBase: servicio.precioBase,
        tipoPrecio: servicio.tipoPrecio,
        garantiaDias: servicio.garantiaDias || 0,
        condiciones: servicio.condiciones || "",
        estado: servicio.estado,
      })
    } else {
      setSelectedServicio(null)
      setFormData({
        codigo: `SRV-${String(serviciosList.length + 1).padStart(3, "0")}`,
        nombre: "",
        descripcion: "",
        categoriaId: "",
        duracionEstimada: 60,
        precioBase: 0,
        tipoPrecio: "fijo",
        garantiaDias: 0,
        condiciones: "",
        estado: "activo",
      })
    }
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setSelectedServicio(null)
    router.push("/helpdesk/servicios")
  }

  const handleSave = () => {
    if (selectedServicio) {
      setServiciosList((prev) =>
        prev.map((s) =>
          s.id === selectedServicio.id
            ? { ...s, ...formData, updatedAt: new Date() }
            : s
        )
      )
    } else {
      const newServicio: HDServicio = {
        id: `srv-${Date.now()}`,
        ...formData,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      setServiciosList((prev) => [newServicio, ...prev])
    }
    closeForm()
  }

  const handleDelete = () => {
    if (selectedServicio) {
      setServiciosList((prev) => prev.filter((s) => s.id !== selectedServicio.id))
      setIsDeleteOpen(false)
      setSelectedServicio(null)
    }
  }

  const getCategoriaName = (categoriaId: string) => {
    return categoriasServicio.find((c) => c.id === categoriaId)?.nombre || "-"
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
  }

  const formatPrice = (price: number, tipo: string) => {
    const formatted = price.toLocaleString("es-AR", { style: "currency", currency: "USD" })
    switch (tipo) {
      case "por_hora":
        return `${formatted}/hora`
      case "por_proyecto":
        return `${formatted} (proyecto)`
      default:
        return formatted
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Catalogo de Servicios</h1>
          <p className="text-muted-foreground">Administra los servicios disponibles</p>
        </div>
        <Button onClick={() => openForm()}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Servicio
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por codigo o nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterCategoria} onValueChange={setFilterCategoria}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas las categorias</SelectItem>
                {categoriasServicio.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="inactivo">Inactivo</SelectItem>
              </SelectContent>
            </Select>
            {(filterCategoria !== "todos" || filterEstado !== "todos") && (
              <Button
                variant="ghost"
                onClick={() => {
                  setFilterCategoria("todos")
                  setFilterEstado("todos")
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codigo</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Duracion Est.</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Garantia</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredServicios.map((servicio) => (
                <TableRow key={servicio.id} className="group">
                  <TableCell className="font-mono text-xs">{servicio.codigo}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{servicio.nombre}</p>
                      {servicio.descripcion && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {servicio.descripcion}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getCategoriaName(servicio.categoriaId)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {formatDuration(servicio.duracionEstimada)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-muted-foreground" />
                      {formatPrice(servicio.precioBase, servicio.tipoPrecio)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {servicio.garantiaDias ? `${servicio.garantiaDias} dias` : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={servicio.estado === "activo" ? "default" : "secondary"}>
                      {servicio.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openForm(servicio)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedServicio(servicio)
                            setIsDeleteOpen(true)
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredServicios.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No se encontraron servicios
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Formulario */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedServicio ? "Editar Servicio" : "Nuevo Servicio"}</DialogTitle>
            <DialogDescription>
              {selectedServicio
                ? "Modifica los datos del servicio"
                : "Complete los datos del nuevo servicio"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="codigo">Codigo</Label>
                <Input
                  id="codigo"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="categoriaId">Categoria *</Label>
                <Select
                  value={formData.categoriaId}
                  onValueChange={(v) => setFormData({ ...formData, categoriaId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriasServicio.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="descripcion">Descripcion</Label>
              <Textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="duracionEstimada">Duracion Estimada (min)</Label>
                <Input
                  id="duracionEstimada"
                  type="number"
                  value={formData.duracionEstimada}
                  onChange={(e) => setFormData({ ...formData, duracionEstimada: Number(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="garantiaDias">Garantia (dias)</Label>
                <Input
                  id="garantiaDias"
                  type="number"
                  value={formData.garantiaDias}
                  onChange={(e) => setFormData({ ...formData, garantiaDias: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="precioBase">Precio Base (USD)</Label>
                <Input
                  id="precioBase"
                  type="number"
                  value={formData.precioBase}
                  onChange={(e) => setFormData({ ...formData, precioBase: Number(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tipoPrecio">Tipo de Precio</Label>
                <Select
                  value={formData.tipoPrecio}
                  onValueChange={(v) => setFormData({ ...formData, tipoPrecio: v as HDServicio["tipoPrecio"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fijo">Precio Fijo</SelectItem>
                    <SelectItem value="por_hora">Por Hora</SelectItem>
                    <SelectItem value="por_proyecto">Por Proyecto</SelectItem>
                    <SelectItem value="escalonado">Escalonado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="estado">Estado</Label>
              <Select
                value={formData.estado}
                onValueChange={(v) => setFormData({ ...formData, estado: v as HDServicio["estado"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="inactivo">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!formData.nombre || !formData.categoriaId}>
              {selectedServicio ? "Guardar cambios" : "Crear servicio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog Eliminar */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar servicio</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. Se eliminara permanentemente el servicio{" "}
              <strong>{selectedServicio?.nombre}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function ServiciosPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-muted-foreground">Cargando...</div>}>
      <ServiciosContent />
    </Suspense>
  )
}
