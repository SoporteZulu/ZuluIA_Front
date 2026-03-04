"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Plus, Search, Pencil, Trash2, UserCircle, Users, ShieldCheck, X } from "lucide-react"
import { crmUsers, type CRMUser } from "@/lib/crm-data"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

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

const Loading = () => null;

export default function UsuariosPage() {
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<CRMUser[]>(crmUsers)
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
    return users.filter((user) => {
      const fullName = `${user.nombre} ${user.apellido}`.toLowerCase()
      const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || user.email.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesRol = filterRol === "todos" || user.rol === filterRol
      const matchesEstado = filterEstado === "todos" || user.estado === filterEstado
      return matchesSearch && matchesRol && matchesEstado
    })
  }, [users, searchTerm, filterRol, filterEstado])

  const stats = useMemo(() => {
    const activos = users.filter((u) => u.estado === "activo").length
    const admins = users.filter((u) => u.rol === "administrador").length
    const comerciales = users.filter((u) => u.rol === "comercial").length
    return { total: users.length, activos, admins, comerciales }
  }, [users])

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

  const handleSubmit = () => {
    if (editingUser) {
      setUsers(
        users.map((u) =>
          u.id === editingUser.id
            ? { ...u, ...formData, updatedAt: new Date() }
            : u
        )
      )
    } else {
      const newUser: CRMUser = {
        id: `user-${Date.now()}`,
        ...formData,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      setUsers([newUser, ...users])
    }
    setIsDialogOpen(false)
    resetForm()
  }

  const handleDelete = () => {
    if (deleteId) {
      setUsers(users.filter((u) => u.id !== deleteId))
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
            <p className="text-muted-foreground">Gestiona los usuarios del sistema CRM</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Nuevo Usuario</Button>
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
                    <Input id="nombre" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="apellido">Apellido *</Label>
                    <Input id="apellido" value={formData.apellido} onChange={(e) => setFormData({ ...formData, apellido: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rol">Rol</Label>
                    <Select value={formData.rol} onValueChange={(v) => setFormData({ ...formData, rol: v as CRMUser["rol"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(rolLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="estado">Estado</Label>
                    <Select value={formData.estado} onValueChange={(v) => setFormData({ ...formData, estado: v as CRMUser["estado"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="activo">Activo</SelectItem>
                        <SelectItem value="inactivo">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Cancelar</Button>
                <Button onClick={handleSubmit} disabled={!formData.nombre || !formData.apellido || !formData.email}>{editingUser ? "Guardar Cambios" : "Crear Usuario"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

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
              <p className="text-xs text-muted-foreground">{((stats.activos / stats.total) * 100).toFixed(0)}% del total</p>
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
        </div>

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
                  <Input placeholder="Buscar usuario..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 w-[200px]" />
                </div>
                <Select value={filterRol} onValueChange={setFilterRol}>
                  <SelectTrigger className="w-[150px]"><SelectValue placeholder="Rol" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los roles</SelectItem>
                    {Object.entries(rolLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterEstado} onValueChange={setFilterEstado}>
                  <SelectTrigger className="w-[130px]"><SelectValue placeholder="Estado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}><X className="mr-1 h-4 w-4" />Limpiar</Button>
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
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar || "/placeholder.svg"} />
                          <AvatarFallback>{getInitials(user.nombre, user.apellido)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.nombre} {user.apellido}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell><Badge className={rolColors[user.rol]}>{rolLabels[user.rol]}</Badge></TableCell>
                    <TableCell><Badge className={estadoColors[user.estado]}>{user.estado}</Badge></TableCell>
                    <TableCell>{user.createdAt.toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(user.id)}><Trash2 className="h-4 w-4" /></Button>
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
              <AlertDialogDescription>Esta acción no se puede deshacer. Se eliminará permanentemente el usuario del sistema.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Suspense>
  )
}
