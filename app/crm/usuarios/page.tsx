"use client"

import { useMemo, useState } from "react"
import { Suspense } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  AlertCircle,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCircle,
  Users,
  X,
} from "lucide-react"
import {
  useCrmCampanas,
  useCrmClientes,
  useCrmInteracciones,
  useCrmOportunidades,
  useCrmTareas,
  useCrmUsuarios,
} from "@/lib/hooks/useCrm"
import type { CRMUser } from "@/lib/types"

const rolLabels: Record<string, string> = {
  administrador: "Administrador",
  supervisor: "Supervisor",
  comercial: "Comercial",
  marketing: "Marketing",
  soporte: "Soporte",
}

const rolColors: Record<string, string> = {
  administrador: "bg-purple-500/20 text-purple-400",
  supervisor: "bg-blue-500/20 text-blue-400",
  comercial: "bg-green-500/20 text-green-400",
  marketing: "bg-orange-500/20 text-orange-400",
  soporte: "bg-cyan-500/20 text-cyan-400",
}

const estadoColors: Record<string, string> = {
  activo: "bg-green-500/20 text-green-400",
  inactivo: "bg-gray-500/20 text-gray-400",
}

const Loading = () => null

function formatDate(value: Date | string | undefined) {
  if (!value) return "-"
  return new Date(value).toLocaleDateString("es-AR")
}

function formatCurrency(value: number) {
  return value.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  })
}

function formatPipelineByCurrency(
  pipelineByCurrency: Partial<Record<"ARS" | "USD" | "EUR" | "MXN", number>>
) {
  const currencies: Array<"ARS" | "USD" | "EUR" | "MXN"> = ["ARS", "USD", "EUR", "MXN"]
  const visible = currencies.filter((currency) => Number(pipelineByCurrency[currency] ?? 0) > 0)

  if (visible.length === 0) {
    return "Sin pipeline visible"
  }

  return visible
    .map((currency) =>
      Number(pipelineByCurrency[currency] ?? 0).toLocaleString("es-AR", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      })
    )
    .join(" · ")
}

function getDaysSince(value: Date | string | undefined) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
}

export default function UsuariosPage() {
  const { usuarios, loading, error, createUsuario, updateUsuario, deleteUsuario } = useCrmUsuarios()
  const { clientes } = useCrmClientes()
  const { oportunidades } = useCrmOportunidades()
  const { tareas } = useCrmTareas()
  const { interacciones } = useCrmInteracciones()
  const { campanas } = useCrmCampanas()

  const [searchTerm, setSearchTerm] = useState("")
  const [filterRol, setFilterRol] = useState<string>("todos")
  const [filterEstado, setFilterEstado] = useState<string>("todos")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<CRMUser | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    email: "",
    rol: "comercial" as CRMUser["rol"],
    estado: "activo" as CRMUser["estado"],
  })

  const filteredUsers = useMemo(() => {
    return usuarios.filter((user) => {
      const fullName = `${user.nombre} ${user.apellido}`.toLowerCase()
      const matchesSearch =
        fullName.includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesRol = filterRol === "todos" || user.rol === filterRol
      const matchesEstado = filterEstado === "todos" || user.estado === filterEstado
      return matchesSearch && matchesRol && matchesEstado
    })
  }, [usuarios, searchTerm, filterRol, filterEstado])

  const stats = useMemo(() => {
    const activos = usuarios.filter((u) => u.estado === "activo").length
    const admins = usuarios.filter((u) => u.rol === "administrador").length
    const comerciales = usuarios.filter((u) => u.rol === "comercial").length
    const seguimientosPendientes = tareas.filter((tarea) =>
      ["pendiente", "en_curso", "vencida"].includes(tarea.estado)
    ).length
    return { total: usuarios.length, activos, admins, comerciales, seguimientosPendientes }
  }, [usuarios, tareas])

  const roleCoverage = useMemo(() => {
    return Object.keys(rolLabels).map((rol) => {
      const usuariosRol = usuarios.filter((usuario) => usuario.rol === rol)
      const activosRol = usuariosRol.filter((usuario) => usuario.estado === "activo").length
      const ids = new Set(usuariosRol.map((usuario) => usuario.id))

      return {
        rol,
        total: usuariosRol.length,
        activos: activosRol,
        oportunidadesAbiertas: oportunidades.filter(
          (oportunidad) =>
            oportunidad.responsableId &&
            ids.has(oportunidad.responsableId) &&
            !["cerrado_ganado", "cerrado_perdido"].includes(oportunidad.etapa)
        ).length,
        tareasPendientes: tareas.filter(
          (tarea) =>
            ids.has(tarea.asignadoAId) &&
            ["pendiente", "en_curso", "vencida"].includes(tarea.estado)
        ).length,
      }
    })
  }, [usuarios, oportunidades, tareas])

  const userRadar = useMemo(() => {
    return usuarios
      .map((user) => {
        const cartera = clientes.filter((cliente) => cliente.responsableId === user.id)
        const oportunidadesAbiertas = oportunidades.filter(
          (oportunidad) =>
            oportunidad.responsableId === user.id &&
            !["cerrado_ganado", "cerrado_perdido"].includes(oportunidad.etapa)
        )
        const pipelineByCurrency = oportunidadesAbiertas.reduce<
          Partial<Record<"ARS" | "USD" | "EUR" | "MXN", number>>
        >((accumulator, oportunidad) => {
          accumulator[oportunidad.moneda] =
            Number(accumulator[oportunidad.moneda] ?? 0) + Number(oportunidad.montoEstimado ?? 0)
          return accumulator
        }, {})
        const tareasUsuario = tareas.filter((tarea) => tarea.asignadoAId === user.id)
        const tareasPendientes = tareasUsuario.filter((tarea) =>
          ["pendiente", "en_curso", "vencida"].includes(tarea.estado)
        )
        const tareasVencidas = tareasUsuario.filter((tarea) => tarea.estado === "vencida")
        const campanasActivas = campanas.filter((campana) => campana.responsableId === user.id)
        const ultimaInteraccion = interacciones
          .filter((interaccion) => interaccion.usuarioResponsableId === user.id)
          .sort(
            (left, right) =>
              new Date(right.fechaHora).getTime() - new Date(left.fechaHora).getTime()
          )[0]

        return {
          user,
          cartera: cartera.length,
          oportunidadesAbiertas: oportunidadesAbiertas.length,
          pipelineByCurrency,
          tareasPendientes: tareasPendientes.length,
          tareasVencidas: tareasVencidas.length,
          campanasActivas: campanasActivas.length,
          ultimaInteraccion: ultimaInteraccion?.fechaHora,
        }
      })
      .sort((left, right) => {
        if (right.tareasVencidas !== left.tareasVencidas)
          return right.tareasVencidas - left.tareasVencidas
        if (right.oportunidadesAbiertas !== left.oportunidadesAbiertas) {
          return right.oportunidadesAbiertas - left.oportunidadesAbiertas
        }
        return right.tareasPendientes - left.tareasPendientes
      })
  }, [usuarios, clientes, oportunidades, tareas, campanas, interacciones])

  const recentUsers = useMemo(() => {
    return [...usuarios]
      .sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      )
      .slice(0, 5)
  }, [usuarios])

  const hasActiveFilters = filterRol !== "todos" || filterEstado !== "todos" || searchTerm !== ""

  const resetForm = () => {
    setFormData({
      nombre: "",
      apellido: "",
      email: "",
      rol: "comercial",
      estado: "activo",
    })
    setEditingUser(null)
  }

  const handleEdit = (user: CRMUser) => {
    setEditingUser(user)
    setFormData({
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
      rol: user.rol,
      estado: user.estado,
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (editingUser) {
      await updateUsuario(editingUser.id, formData)
    } else {
      await createUsuario(formData as Omit<CRMUser, "id" | "createdAt" | "updatedAt">)
    }
    setIsDialogOpen(false)
    resetForm()
  }

  const handleDelete = async () => {
    if (deleteId) {
      await deleteUsuario(deleteId)
      setDeleteId(null)
    }
  }

  const getInitials = (nombre: string, apellido: string) => {
    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase()
  }

  const clearFilters = () => {
    setSearchTerm("")
    setFilterRol("todos")
    setFilterEstado("todos")
  }

  return (
    <Suspense fallback={<Loading />}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Usuarios</h1>
            <p className="text-muted-foreground">
              Gestión de usuarios CRM con carga comercial y seguimiento visible por responsable
            </p>
          </div>
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open)
              if (!open) resetForm()
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Usuario
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingUser ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle>
                <DialogDescription>Complete los datos del usuario</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nombre">Nombre *</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="apellido">Apellido *</Label>
                    <Input
                      id="apellido"
                      value={formData.apellido}
                      onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rol">Rol</Label>
                    <Select
                      value={formData.rol}
                      onValueChange={(v) => setFormData({ ...formData, rol: v as CRMUser["rol"] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(rolLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="estado">Estado</Label>
                    <Select
                      value={formData.estado}
                      onValueChange={(v) =>
                        setFormData({ ...formData, estado: v as CRMUser["estado"] })
                      }
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
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false)
                    resetForm()
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!formData.nombre || !formData.apellido || !formData.email}
                >
                  {editingUser ? "Guardar Cambios" : "Crear Usuario"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">registrados en el sistema</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
              <UserCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activos}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total
                  ? `${((stats.activos / stats.total) * 100).toFixed(0)}% del total`
                  : "Sin usuarios visibles"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Administradores</CardTitle>
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.admins}</div>
              <p className="text-xs text-muted-foreground">con acceso total</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comerciales</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.comerciales}</div>
              <p className="text-xs text-muted-foreground">equipo de ventas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Seguimientos Pendientes</CardTitle>
              <UserCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">
                {stats.seguimientosPendientes}
              </div>
              <p className="text-xs text-muted-foreground">
                tareas CRM abiertas entre responsables visibles
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <Card>
            <CardHeader>
              <CardTitle>Radar por Responsable</CardTitle>
              <CardDescription>
                Cartera, pipeline, tareas y actividad reciente por usuario CRM
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Responsable</TableHead>
                    <TableHead>Cartera</TableHead>
                    <TableHead>Pipeline visible</TableHead>
                    <TableHead>Tareas</TableHead>
                    <TableHead>Ultima Interaccion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userRadar.map((entry) => (
                    <TableRow key={entry.user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={entry.user.avatar || "/placeholder.svg"} />
                            <AvatarFallback>
                              {getInitials(entry.user.nombre, entry.user.apellido)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {entry.user.nombre} {entry.user.apellido}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {rolLabels[entry.user.rol]}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{entry.cartera}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            {formatPipelineByCurrency(entry.pipelineByCurrency)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {entry.oportunidadesAbiertas} oportunidades abiertas
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={entry.tareasVencidas > 0 ? "destructive" : "outline"}>
                            {entry.tareasPendientes} abiertas
                          </Badge>
                          {entry.tareasVencidas > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {entry.tareasVencidas} vencidas
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(entry.ultimaInteraccion)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Altas y Cobertura</CardTitle>
              <CardDescription>Lectura rápida del maestro de usuarios visible</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-medium">Roles cubiertos</p>
                <p className="mt-1 text-2xl font-semibold">
                  {roleCoverage.filter((item) => item.total > 0).length} /{" "}
                  {Object.keys(rolLabels).length}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  La estructura visible ya cubre administración, ventas, marketing y soporte según
                  lo expuesto.
                </p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-medium">Campañas con responsable</p>
                <p className="mt-1 text-2xl font-semibold">
                  {campanas.filter((campana) => campana.responsableId).length}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Acciones comerciales ya asociadas a usuarios CRM activos o históricos.
                </p>
              </div>
              <div className="space-y-3">
                {recentUsers.map((user) => {
                  const age = getDaysSince(user.createdAt)

                  return (
                    <div key={user.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">
                            {user.nombre} {user.apellido}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {rolLabels[user.rol]} • {user.email}
                          </p>
                        </div>
                        <Badge variant={user.estado === "activo" ? "secondary" : "outline"}>
                          {user.estado}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Alta: {formatDate(user.createdAt)}
                        {age !== null ? ` • ${age} días en el maestro` : ""}
                      </p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cobertura por Rol</CardTitle>
            <CardDescription>
              Control operativo del equipo visible por rol funcional
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rol</TableHead>
                  <TableHead>Usuarios</TableHead>
                  <TableHead>Activos</TableHead>
                  <TableHead>Oportunidades Abiertas</TableHead>
                  <TableHead>Tareas Pendientes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roleCoverage.map((item) => (
                  <TableRow key={item.rol}>
                    <TableCell>
                      <Badge className={rolColors[item.rol]}>{rolLabels[item.rol]}</Badge>
                    </TableCell>
                    <TableCell>{item.total}</TableCell>
                    <TableCell>{item.activos}</TableCell>
                    <TableCell>{item.oportunidadesAbiertas}</TableCell>
                    <TableCell>
                      <Badge variant={item.tareasPendientes > 0 ? "outline" : "secondary"}>
                        {item.tareasPendientes > 0
                          ? `${item.tareasPendientes} abiertas`
                          : "Sin pendiente"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Lista de Usuarios</CardTitle>
                <CardDescription>{filteredUsers.length} usuarios encontrados</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar usuario..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-50 pl-8"
                  />
                </div>
                <Select value={filterRol} onValueChange={setFilterRol}>
                  <SelectTrigger className="w-37.5">
                    <SelectValue placeholder="Rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los roles</SelectItem>
                    {Object.entries(rolLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterEstado} onValueChange={setFilterEstado}>
                  <SelectTrigger className="w-32.5">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="mr-1 h-4 w-4" />
                    Limpiar
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Alta</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Cargando usuarios CRM...
                    </TableCell>
                  </TableRow>
                )}
                {!loading && filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No hay usuarios que coincidan con los filtros actuales.
                    </TableCell>
                  </TableRow>
                )}
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar || "/placeholder.svg"} />
                          <AvatarFallback>{getInitials(user.nombre, user.apellido)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {user.nombre} {user.apellido}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge className={rolColors[user.rol]}>{rolLabels[user.rol]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={estadoColors[user.estado]}>{user.estado}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(user.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar Usuario</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará permanentemente el usuario del
                sistema.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Suspense>
  )
}
