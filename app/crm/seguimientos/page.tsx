"use client"

import React, { Suspense, useMemo, useState } from "react"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, Pencil, Plus, Search, Trash2 } from "lucide-react"
import {
  useCrmCampanas,
  useCrmClientes,
  useCrmIntereses,
  useCrmMotivos,
  useCrmSeguimientos,
  useCrmUsuarios,
} from "@/lib/hooks/useCrm"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"
import type { CRMSeguimiento } from "@/lib/types"

type FormState = {
  terceroId: string
  campanaId: string
  motivoId: string
  interesId: string
  fecha: string
  descripcion: string
  proximaAccion: string
  usuarioId: string
}

function formatDate(value?: Date | string | null) {
  if (!value) return "-"
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value))
}

function buildEmptyForm(): FormState {
  return {
    terceroId: "",
    campanaId: "__none__",
    motivoId: "__none__",
    interesId: "__none__",
    fecha: new Date().toISOString().split("T")[0],
    descripcion: "",
    proximaAccion: "",
    usuarioId: "__none__",
  }
}

function SeguimientosContent() {
  const sucursalId = useDefaultSucursalId()
  const [search, setSearch] = useState("")
  const [filterCliente, setFilterCliente] = useState("all")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CRMSeguimiento | null>(null)
  const [editing, setEditing] = useState<CRMSeguimiento | null>(null)
  const [formData, setFormData] = useState<FormState>(buildEmptyForm())

  const { seguimientos, loading, error, createSeguimiento, updateSeguimiento, deleteSeguimiento } =
    useCrmSeguimientos(sucursalId)
  const { clientes } = useCrmClientes()
  const { campanas } = useCrmCampanas()
  const { usuarios } = useCrmUsuarios()
  const { motivos } = useCrmMotivos()
  const { intereses } = useCrmIntereses()

  const clientsById = useMemo(() => new Map(clientes.map((item) => [item.id, item])), [clientes])
  const campaignsById = useMemo(() => new Map(campanas.map((item) => [item.id, item])), [campanas])
  const motivosById = useMemo(() => new Map(motivos.map((item) => [item.id, item])), [motivos])
  const interesesById = useMemo(
    () => new Map(intereses.map((item) => [item.id, item])),
    [intereses]
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return seguimientos.filter((item) => {
      const matchesSearch =
        term === "" ||
        item.descripcion.toLowerCase().includes(term) ||
        clientsById.get(item.terceroId)?.nombre.toLowerCase().includes(term)
      const matchesCliente = filterCliente === "all" || item.terceroId === filterCliente
      return matchesSearch && matchesCliente
    })
  }, [clientsById, filterCliente, search, seguimientos])

  const today = useMemo(() => {
    const base = new Date()
    base.setHours(0, 0, 0, 0)
    return base
  }, [])

  const stats = useMemo(() => {
    const pendientes = filtered.filter((item) => item.proximaAccion).length
    const vencidos = filtered.filter((item) => {
      if (!item.proximaAccion) return false
      const next = new Date(item.proximaAccion)
      next.setHours(0, 0, 0, 0)
      return next < today
    }).length
    return {
      total: filtered.length,
      conCampana: filtered.filter((item) => item.campanaId).length,
      conProximaAccion: pendientes,
      vencidos,
    }
  }, [filtered, today])

  const rows = useMemo(
    () =>
      [...filtered].sort(
        (left, right) => new Date(right.fecha).getTime() - new Date(left.fecha).getTime()
      ),
    [filtered]
  )

  const resetForm = () => {
    setFormData(buildEmptyForm())
    setEditing(null)
  }

  const openCreate = () => {
    resetForm()
    setIsFormOpen(true)
  }

  const openEdit = (item: CRMSeguimiento) => {
    setEditing(item)
    setFormData({
      terceroId: item.terceroId,
      campanaId: item.campanaId ?? "__none__",
      motivoId: item.motivoId ?? "__none__",
      interesId: item.interesId ?? "__none__",
      fecha: new Date(item.fecha).toISOString().split("T")[0],
      descripcion: item.descripcion,
      proximaAccion: item.proximaAccion
        ? new Date(item.proximaAccion).toISOString().split("T")[0]
        : "",
      usuarioId: item.usuarioId ?? "__none__",
    })
    setIsFormOpen(true)
  }

  const submit = async () => {
    if (!sucursalId) return

    if (editing) {
      await updateSeguimiento(editing.id, {
        descripcion: formData.descripcion,
        proximaAccion: formData.proximaAccion ? new Date(formData.proximaAccion) : undefined,
      })
    } else {
      await createSeguimiento({
        sucursalId,
        terceroId: formData.terceroId,
        campanaId: formData.campanaId === "__none__" ? undefined : formData.campanaId,
        motivoId: formData.motivoId === "__none__" ? undefined : formData.motivoId,
        interesId: formData.interesId === "__none__" ? undefined : formData.interesId,
        fecha: new Date(formData.fecha),
        descripcion: formData.descripcion,
        proximaAccion: formData.proximaAccion ? new Date(formData.proximaAccion) : undefined,
        usuarioId: formData.usuarioId === "__none__" ? undefined : formData.usuarioId,
      })
    }

    setIsFormOpen(false)
    resetForm()
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    await deleteSeguimiento(deleteTarget.id)
    setDeleteTarget(null)
  }

  if (!sucursalId) {
    return (
      <div className="flex min-h-80 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
        Cargando sucursal activa...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Seguimientos</h1>
          <p className="text-muted-foreground">
            Acciones de seguimiento CRM sobre la sucursal {sucursalId}.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo seguimiento
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Seguimientos</p>
            <p className="mt-2 text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Con campaña</p>
            <p className="mt-2 text-2xl font-bold text-blue-500">{stats.conCampana}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Con próxima acción</p>
            <p className="mt-2 text-2xl font-bold text-emerald-500">{stats.conProximaAccion}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Vencidos</p>
            <p className="mt-2 text-2xl font-bold text-amber-500">{stats.vencidos}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_260px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por descripción o cliente..."
                className="pl-10"
              />
            </div>
            <Select value={filterCliente} onValueChange={setFilterCliente}>
              <SelectTrigger>
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los clientes</SelectItem>
                {clientes.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Motivo / Interés</TableHead>
                <TableHead>Próxima acción</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Cargando seguimientos...
                  </TableCell>
                </TableRow>
              )}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No hay seguimientos para los filtros actuales.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((item) => {
                const nextActionOverdue = item.proximaAccion
                  ? new Date(item.proximaAccion).setHours(0, 0, 0, 0) < today.getTime()
                  : false

                return (
                  <TableRow key={item.id} className="group">
                    <TableCell>{formatDate(item.fecha)}</TableCell>
                    <TableCell>
                      {clientsById.get(item.terceroId)?.nombre ?? `#${item.terceroId}`}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium line-clamp-2">{item.descripcion}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.campanaId
                            ? (campaignsById.get(item.campanaId)?.nombre ?? `#${item.campanaId}`)
                            : "Sin campaña"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p>
                          {item.motivoId
                            ? (motivosById.get(item.motivoId)?.descripcion ?? `#${item.motivoId}`)
                            : "Sin motivo"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.interesId
                            ? (interesesById.get(item.interesId)?.descripcion ??
                              `#${item.interesId}`)
                            : "Sin interés"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.proximaAccion ? (
                        <Badge variant={nextActionOverdue ? "destructive" : "outline"}>
                          {formatDate(item.proximaAccion)}
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(item)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open)
          if (!open) resetForm()
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar seguimiento" : "Nuevo seguimiento"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "En edición sólo se actualizan descripción y próxima acción, como define el backend."
                : "Alta de seguimiento CRM con motivo, interés y próxima acción opcional."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select
                  value={formData.terceroId}
                  onValueChange={(value) =>
                    setFormData((current) => ({ ...current, terceroId: value }))
                  }
                  disabled={Boolean(editing)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={formData.fecha}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, fecha: event.target.value }))
                  }
                  disabled={Boolean(editing)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Campaña</Label>
                <Select
                  value={formData.campanaId}
                  onValueChange={(value) =>
                    setFormData((current) => ({ ...current, campanaId: value }))
                  }
                  disabled={Boolean(editing)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin campaña" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin campaña</SelectItem>
                    {campanas.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Motivo</Label>
                <Select
                  value={formData.motivoId}
                  onValueChange={(value) =>
                    setFormData((current) => ({ ...current, motivoId: value }))
                  }
                  disabled={Boolean(editing)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin motivo</SelectItem>
                    {motivos.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.descripcion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Interés</Label>
                <Select
                  value={formData.interesId}
                  onValueChange={(value) =>
                    setFormData((current) => ({ ...current, interesId: value }))
                  }
                  disabled={Boolean(editing)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin interés" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin interés</SelectItem>
                    {intereses.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.descripcion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Autor</Label>
                <Select
                  value={formData.usuarioId}
                  onValueChange={(value) =>
                    setFormData((current) => ({ ...current, usuarioId: value }))
                  }
                  disabled={Boolean(editing)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin autor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin autor</SelectItem>
                    {usuarios.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.nombre} {item.apellido}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                rows={5}
                value={formData.descripcion}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, descripcion: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Próxima acción</Label>
              <Input
                type="date"
                value={formData.proximaAccion}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, proximaAccion: event.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={!formData.terceroId || !formData.descripcion.trim()}>
              {editing ? "Guardar cambios" : "Crear seguimiento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar seguimiento</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el seguimiento seleccionado del historial CRM.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function SeguimientosPage() {
  return (
    <Suspense fallback={null}>
      <SeguimientosContent />
    </Suspense>
  )
}
