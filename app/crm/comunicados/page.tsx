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
  useCrmComunicados,
  useCrmTiposComunicado,
  useCrmUsuarios,
} from "@/lib/hooks/useCrm"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"
import type { CRMComunicado } from "@/lib/types"

type FormState = {
  terceroId: string
  campanaId: string
  tipoId: string
  fecha: string
  asunto: string
  contenido: string
  usuarioId: string
}

function formatDate(value?: Date | string | null) {
  if (!value) return "Sin fecha"
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
    tipoId: "__none__",
    fecha: new Date().toISOString().split("T")[0],
    asunto: "",
    contenido: "",
    usuarioId: "__none__",
  }
}

function ComunicadosContent() {
  const sucursalId = useDefaultSucursalId()
  const [search, setSearch] = useState("")
  const [filterCliente, setFilterCliente] = useState("all")
  const [filterCampana, setFilterCampana] = useState("all")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CRMComunicado | null>(null)
  const [editing, setEditing] = useState<CRMComunicado | null>(null)
  const [formData, setFormData] = useState<FormState>(buildEmptyForm())

  const { comunicados, loading, error, createComunicado, updateComunicado, deleteComunicado } =
    useCrmComunicados(sucursalId)
  const { tiposComunicado } = useCrmTiposComunicado()
  const { clientes } = useCrmClientes()
  const { campanas } = useCrmCampanas()
  const { usuarios } = useCrmUsuarios()

  const clientsById = useMemo(() => new Map(clientes.map((item) => [item.id, item])), [clientes])
  const campaignsById = useMemo(() => new Map(campanas.map((item) => [item.id, item])), [campanas])
  const usersById = useMemo(() => new Map(usuarios.map((item) => [item.id, item])), [usuarios])
  const tiposById = useMemo(
    () => new Map(tiposComunicado.map((item) => [item.id, item])),
    [tiposComunicado]
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return comunicados.filter((item) => {
      const matchesSearch =
        term === "" ||
        item.asunto.toLowerCase().includes(term) ||
        item.contenido?.toLowerCase().includes(term) ||
        clientsById.get(item.terceroId)?.nombre.toLowerCase().includes(term)
      const matchesCliente = filterCliente === "all" || item.terceroId === filterCliente
      const matchesCampana =
        filterCampana === "all" || (item.campanaId ?? "__none__") === filterCampana
      return matchesSearch && matchesCliente && matchesCampana
    })
  }, [clientsById, comunicados, filterCampana, filterCliente, search])

  const stats = useMemo(() => {
    return {
      total: filtered.length,
      conCampana: filtered.filter((item) => item.campanaId).length,
      tipificados: filtered.filter((item) => item.tipoId).length,
      conAutor: filtered.filter((item) => item.usuarioId).length,
    }
  }, [filtered])

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

  const openEdit = (item: CRMComunicado) => {
    setEditing(item)
    setFormData({
      terceroId: item.terceroId,
      campanaId: item.campanaId ?? "__none__",
      tipoId: item.tipoId ?? "__none__",
      fecha: new Date(item.fecha).toISOString().split("T")[0],
      asunto: item.asunto,
      contenido: item.contenido ?? "",
      usuarioId: item.usuarioId ?? "__none__",
    })
    setIsFormOpen(true)
  }

  const submit = async () => {
    if (!sucursalId) return

    if (editing) {
      await updateComunicado(editing.id, {
        asunto: formData.asunto,
        contenido: formData.contenido || undefined,
      })
    } else {
      await createComunicado({
        sucursalId,
        terceroId: formData.terceroId,
        campanaId: formData.campanaId === "__none__" ? undefined : formData.campanaId,
        tipoId: formData.tipoId === "__none__" ? undefined : formData.tipoId,
        fecha: new Date(formData.fecha),
        asunto: formData.asunto,
        contenido: formData.contenido || undefined,
        usuarioId: formData.usuarioId === "__none__" ? undefined : formData.usuarioId,
      })
    }

    setIsFormOpen(false)
    resetForm()
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    await deleteComunicado(deleteTarget.id)
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
          <h1 className="text-3xl font-bold">Comunicados</h1>
          <p className="text-muted-foreground">
            Mensajes CRM emitidos desde la sucursal {sucursalId}.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo comunicado
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
            <p className="text-sm text-muted-foreground">Comunicados</p>
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
            <p className="text-sm text-muted-foreground">Tipificados</p>
            <p className="mt-2 text-2xl font-bold text-emerald-500">{stats.tipificados}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Con autor</p>
            <p className="mt-2 text-2xl font-bold text-amber-500">{stats.conAutor}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_220px_220px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por asunto, contenido o cliente..."
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
            <Select value={filterCampana} onValueChange={setFilterCampana}>
              <SelectTrigger>
                <SelectValue placeholder="Campaña" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las campañas</SelectItem>
                <SelectItem value="__none__">Sin campaña</SelectItem>
                {campanas.map((item) => (
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
                <TableHead>Asunto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Campaña</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Autor</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Cargando comunicados...
                  </TableCell>
                </TableRow>
              )}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No hay comunicados para los filtros actuales.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((item) => (
                <TableRow key={item.id} className="group">
                  <TableCell>{formatDate(item.fecha)}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium">{item.asunto}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {item.contenido || "Sin contenido adicional"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {clientsById.get(item.terceroId)?.nombre ?? `#${item.terceroId}`}
                  </TableCell>
                  <TableCell>
                    {item.campanaId
                      ? (campaignsById.get(item.campanaId)?.nombre ?? `#${item.campanaId}`)
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {item.tipoId ? (
                      <Badge variant="outline">
                        {tiposById.get(item.tipoId)?.descripcion ?? `#${item.tipoId}`}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {item.usuarioId
                      ? `${usersById.get(item.usuarioId)?.nombre ?? ""} ${usersById.get(item.usuarioId)?.apellido ?? ""}`.trim() ||
                        `#${item.usuarioId}`
                      : "-"}
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
              ))}
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
            <DialogTitle>{editing ? "Editar comunicado" : "Nuevo comunicado"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "En edición sólo se actualizan asunto y contenido, igual que en el backend."
                : "Alta de comunicado CRM sobre la sucursal activa."}
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

            <div className="grid gap-4 md:grid-cols-3">
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
                <Label>Tipo</Label>
                <Select
                  value={formData.tipoId}
                  onValueChange={(value) =>
                    setFormData((current) => ({ ...current, tipoId: value }))
                  }
                  disabled={Boolean(editing)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin tipo</SelectItem>
                    {tiposComunicado.map((item) => (
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
              <Label>Asunto</Label>
              <Input
                value={formData.asunto}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, asunto: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Contenido</Label>
              <Textarea
                rows={5}
                value={formData.contenido}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, contenido: event.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={!formData.terceroId || !formData.asunto.trim()}>
              {editing ? "Guardar cambios" : "Crear comunicado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar comunicado</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el comunicado seleccionado del historial CRM.
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

export default function ComunicadosPage() {
  return (
    <Suspense fallback={null}>
      <ComunicadosContent />
    </Suspense>
  )
}
