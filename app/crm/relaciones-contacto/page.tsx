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
import { AlertCircle, Pencil, Plus, Search, Trash2 } from "lucide-react"
import {
  useCrmClientes,
  useCrmContactos,
  useCrmRelacionesContacto,
  useCrmTiposRelacion,
} from "@/lib/hooks/useCrm"
import type { CRMRelacionContacto } from "@/lib/types"
import { CrmPageHero, CrmStatCard, crmPanelClassName } from "@/components/crm/crm-page-kit"

type FormState = {
  personaId: string
  personaContactoId: string
  tipoRelacionId: string
}

function buildEmptyForm(): FormState {
  return {
    personaId: "",
    personaContactoId: "",
    tipoRelacionId: "",
  }
}

function RelacionesContactoContent() {
  const [search, setSearch] = useState("")
  const [filterPersona, setFilterPersona] = useState("all")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editing, setEditing] = useState<CRMRelacionContacto | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CRMRelacionContacto | null>(null)
  const [formData, setFormData] = useState<FormState>(buildEmptyForm())

  const personaId = filterPersona === "all" ? undefined : filterPersona
  const { relacionesContacto, loading, error, createRelacion, updateRelacion, deleteRelacion } =
    useCrmRelacionesContacto(personaId)
  const { clientes } = useCrmClientes()
  const { contactos } = useCrmContactos()
  const {
    tiposRelacion,
    loading: loadingTiposRelacion,
    error: tiposRelacionError,
  } = useCrmTiposRelacion()

  const clientsById = useMemo(() => new Map(clientes.map((item) => [item.id, item])), [clientes])
  const contactsById = useMemo(() => new Map(contactos.map((item) => [item.id, item])), [contactos])
  const relationTypesById = useMemo(
    () => new Map(tiposRelacion.map((item) => [item.id, item])),
    [tiposRelacion]
  )
  const activeRelationTypes = useMemo(
    () => tiposRelacion.filter((item) => item.activo),
    [tiposRelacion]
  )
  const relationTypeOptions = useMemo(() => {
    if (!editing?.tipoRelacionId) {
      return activeRelationTypes
    }

    const currentType = relationTypesById.get(editing.tipoRelacionId)
    if (!currentType || currentType.activo) {
      return activeRelationTypes
    }

    return [currentType, ...activeRelationTypes]
  }, [activeRelationTypes, editing, relationTypesById])

  const availableContacts = useMemo(() => {
    if (!formData.personaId || editing) return contactos
    return contactos.filter((item) => item.clienteId === formData.personaId)
  }, [contactos, editing, formData.personaId])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return relacionesContacto.filter((item) => {
      const persona = clientsById.get(item.personaId)
      const contacto = contactsById.get(item.personaContactoId)
      const matchesSearch =
        term === "" ||
        persona?.nombre.toLowerCase().includes(term) ||
        `${contacto?.nombre ?? ""} ${contacto?.apellido ?? ""}`.toLowerCase().includes(term) ||
        relationTypesById
          .get(item.tipoRelacionId ?? "")
          ?.descripcion?.toLowerCase()
          .includes(term) ||
        relationTypesById
          .get(item.tipoRelacionId ?? "")
          ?.codigo.toLowerCase()
          .includes(term) ||
        (item.tipoRelacionId ?? "").toLowerCase().includes(term)

      return matchesSearch
    })
  }, [clientsById, contactsById, relationTypesById, relacionesContacto, search])

  const stats = useMemo(() => {
    return {
      total: filtered.length,
      conTipo: filtered.filter((item) => Boolean(item.tipoRelacionId)).length,
      clientes: new Set(filtered.map((item) => item.personaId)).size,
      contactos: new Set(filtered.map((item) => item.personaContactoId)).size,
    }
  }, [filtered])

  const resetForm = () => {
    setFormData(buildEmptyForm())
    setEditing(null)
  }

  const openCreate = () => {
    resetForm()
    if (filterPersona !== "all") {
      setFormData((current) => ({ ...current, personaId: filterPersona }))
    }
    setIsFormOpen(true)
  }

  const openEdit = (item: CRMRelacionContacto) => {
    setEditing(item)
    setFormData({
      personaId: item.personaId,
      personaContactoId: item.personaContactoId,
      tipoRelacionId: item.tipoRelacionId ?? "",
    })
    setIsFormOpen(true)
  }

  const submit = async () => {
    if (!formData.personaId || !formData.personaContactoId) return

    if (editing) {
      await updateRelacion(editing.id, {
        tipoRelacionId: formData.tipoRelacionId || undefined,
      })
    } else {
      await createRelacion({
        personaId: formData.personaId,
        personaContactoId: formData.personaContactoId,
        tipoRelacionId: formData.tipoRelacionId || undefined,
      })
    }

    setIsFormOpen(false)
    resetForm()
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    await deleteRelacion(deleteTarget.id)
    setDeleteTarget(null)
  }

  const combinedError = error ?? tiposRelacionError

  return (
    <div className="space-y-6">
      <CrmPageHero
        eyebrow="CRM relaciones"
        title="Relaciones de contacto"
        description="Vincula clientes con contactos CRM y administra el tipo de relación enviado al backend."
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva relación
          </Button>
        }
      />

      {combinedError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{combinedError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <CrmStatCard
          label="Relaciones"
          value={stats.total}
          hint="Vínculos visibles con los filtros actuales."
          icon={Search}
          tone="blue"
        />
        <CrmStatCard
          label="Con tipo"
          value={stats.conTipo}
          hint="Relaciones tipificadas con catálogo semántico."
          icon={Pencil}
          tone="violet"
        />
        <CrmStatCard
          label="Clientes vinculados"
          value={stats.clientes}
          hint="Clientes con red activa de contactos."
          icon={Plus}
          tone="emerald"
        />
        <CrmStatCard
          label="Contactos vinculados"
          value={stats.contactos}
          hint="Contactos alcanzados por la red actual."
          icon={Trash2}
          tone="amber"
        />
      </div>

      <Card className={crmPanelClassName}>
        <CardContent className="pt-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_260px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por cliente, contacto o tipo..."
                className="pl-10"
              />
            </div>
            <Select value={filterPersona} onValueChange={setFilterPersona}>
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

      <Card className={crmPanelClassName}>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Tipo relación</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(loading || loadingTiposRelacion) && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Cargando relaciones de contacto...
                  </TableCell>
                </TableRow>
              )}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    No hay relaciones para los filtros seleccionados.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((item) => {
                const persona = clientsById.get(item.personaId)
                const contacto = contactsById.get(item.personaContactoId)

                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">
                        {persona?.nombre ?? `Persona #${item.personaId}`}
                      </div>
                      <p className="text-xs text-muted-foreground">ID {item.personaId}</p>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {contacto
                          ? `${contacto.nombre} ${contacto.apellido}`
                          : `Contacto #${item.personaContactoId}`}
                      </div>
                      <p className="text-xs text-muted-foreground">ID {item.personaContactoId}</p>
                    </TableCell>
                    <TableCell>
                      {item.tipoRelacionId ? (
                        relationTypesById.get(item.tipoRelacionId) ? (
                          <div className="space-y-1">
                            <Badge variant="secondary">
                              {relationTypesById.get(item.tipoRelacionId)?.descripcion}
                            </Badge>
                            <p className="text-xs text-muted-foreground">
                              {relationTypesById.get(item.tipoRelacionId)?.codigo}
                            </p>
                          </div>
                        ) : (
                          <Badge variant="outline">Tipo #{item.tipoRelacionId}</Badge>
                        )
                      ) : (
                        <Badge variant="outline">Sin tipo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => setDeleteTarget(item)}
                        >
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
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar relación" : "Nueva relación"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "El backend solo permite actualizar el tipo de relación."
                : "Selecciona cliente y contacto para crear el vínculo."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="personaId">Cliente</Label>
              <Select
                value={formData.personaId || "__empty__"}
                onValueChange={(value) => {
                  const nextValue = value === "__empty__" ? "" : value
                  setFormData((current) => ({
                    ...current,
                    personaId: nextValue,
                    personaContactoId: editing ? current.personaContactoId : "",
                  }))
                }}
                disabled={Boolean(editing)}
              >
                <SelectTrigger id="personaId">
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__empty__">Seleccionar cliente</SelectItem>
                  {clientes.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="personaContactoId">Contacto</Label>
              <Select
                value={formData.personaContactoId || "__empty__"}
                onValueChange={(value) =>
                  setFormData((current) => ({
                    ...current,
                    personaContactoId: value === "__empty__" ? "" : value,
                  }))
                }
                disabled={Boolean(editing)}
              >
                <SelectTrigger id="personaContactoId">
                  <SelectValue placeholder="Seleccionar contacto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__empty__">Seleccionar contacto</SelectItem>
                  {availableContacts.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.nombre} {item.apellido}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tipoRelacionId">Tipo de relación</Label>
              <Select
                value={formData.tipoRelacionId || "__none__"}
                onValueChange={(value) =>
                  setFormData((current) => ({
                    ...current,
                    tipoRelacionId: value === "__none__" ? "" : value,
                  }))
                }
              >
                <SelectTrigger id="tipoRelacionId">
                  <SelectValue placeholder="Sin tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin tipo</SelectItem>
                  {relationTypeOptions.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.descripcion}
                      {!item.activo ? " (inactivo)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.tipoRelacionId && relationTypesById.get(formData.tipoRelacionId) && (
                <p className="text-xs text-muted-foreground">
                  Código {relationTypesById.get(formData.tipoRelacionId)?.codigo}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={!formData.personaId || !formData.personaContactoId}>
              {editing ? "Guardar cambios" : "Crear relación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar relación</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción quitará el vínculo CRM seleccionado y no se puede deshacer.
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

export default function RelacionesContactoPage() {
  return (
    <Suspense fallback={null}>
      <RelacionesContactoContent />
    </Suspense>
  )
}
