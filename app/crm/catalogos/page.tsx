"use client"

import React, { Suspense, useMemo, useState } from "react"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, Pencil, Plus, Search, ToggleLeft, ToggleRight } from "lucide-react"
import { useCrmIntereses, useCrmMotivos, useCrmTiposComunicado } from "@/lib/hooks/useCrm"
import type { CrmCatalogDetailOption } from "@/lib/types"
import { CrmPageHero, CrmStatCard, crmPanelClassName } from "@/components/crm/crm-page-kit"

type CatalogKey = "tipos" | "motivos" | "intereses"

type FormState = {
  codigo: string
  descripcion: string
}

type EditingState = {
  kind: CatalogKey
  item: CrmCatalogDetailOption
} | null

const catalogLabels: Record<CatalogKey, { title: string; singular: string }> = {
  tipos: { title: "Tipos de comunicado", singular: "tipo" },
  motivos: { title: "Motivos CRM", singular: "motivo" },
  intereses: { title: "Intereses CRM", singular: "interés" },
}

function buildEmptyForm(): FormState {
  return {
    codigo: "",
    descripcion: "",
  }
}

function CatalogosCrmContent() {
  const [activeTab, setActiveTab] = useState<CatalogKey>("tipos")
  const [search, setSearch] = useState("")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editing, setEditing] = useState<EditingState>(null)
  const [formData, setFormData] = useState<FormState>(buildEmptyForm())

  const tipos = useCrmTiposComunicado(undefined)
  const motivos = useCrmMotivos(undefined)
  const intereses = useCrmIntereses(undefined)

  const catalogs = useMemo(
    () => ({
      tipos: {
        items: tipos.tiposComunicado,
        loading: tipos.loading,
        error: tipos.error,
        create: tipos.createTipoComunicado,
        update: tipos.updateTipoComunicado,
        activate: tipos.activateTipoComunicado,
        deactivate: tipos.deactivateTipoComunicado,
      },
      motivos: {
        items: motivos.motivos,
        loading: motivos.loading,
        error: motivos.error,
        create: motivos.createMotivo,
        update: motivos.updateMotivo,
        activate: motivos.activateMotivo,
        deactivate: motivos.deactivateMotivo,
      },
      intereses: {
        items: intereses.intereses,
        loading: intereses.loading,
        error: intereses.error,
        create: intereses.createInteres,
        update: intereses.updateInteres,
        activate: intereses.activateInteres,
        deactivate: intereses.deactivateInteres,
      },
    }),
    [intereses, motivos, tipos]
  )

  const current = catalogs[activeTab]
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return current.items.filter((item) => {
      if (term === "") return true
      return (
        item.codigo.toLowerCase().includes(term) || item.descripcion.toLowerCase().includes(term)
      )
    })
  }, [current.items, search])

  const globalStats = useMemo(() => {
    const allItems = [...tipos.tiposComunicado, ...motivos.motivos, ...intereses.intereses]
    return {
      total: allItems.length,
      activos: allItems.filter((item) => item.activo).length,
      inactivos: allItems.filter((item) => !item.activo).length,
    }
  }, [intereses.intereses, motivos.motivos, tipos.tiposComunicado])

  const resetForm = () => {
    setEditing(null)
    setFormData(buildEmptyForm())
  }

  const openCreate = () => {
    resetForm()
    setIsFormOpen(true)
  }

  const openEdit = (kind: CatalogKey, item: CrmCatalogDetailOption) => {
    setEditing({ kind, item })
    setActiveTab(kind)
    setFormData({
      codigo: item.codigo,
      descripcion: item.descripcion,
    })
    setIsFormOpen(true)
  }

  const submit = async () => {
    const selectedKind = editing?.kind ?? activeTab
    const actions = catalogs[selectedKind]

    if (editing?.item) {
      await actions.update(editing.item.id, formData.descripcion)
    } else {
      await actions.create(formData.codigo.trim(), formData.descripcion.trim())
    }

    setIsFormOpen(false)
    resetForm()
  }

  const toggleStatus = async (kind: CatalogKey, item: CrmCatalogDetailOption) => {
    const actions = catalogs[kind]
    if (item.activo) {
      await actions.deactivate(item.id)
      return
    }
    await actions.activate(item.id)
  }

  const combinedError = tipos.error ?? motivos.error ?? intereses.error

  return (
    <div className="space-y-6">
      <CrmPageHero
        eyebrow="CRM catálogos"
        title="Catálogos CRM"
        description="Administra códigos auxiliares expuestos por el backend para comunicados y seguimientos."
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo catálogo
          </Button>
        }
      />

      {combinedError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{combinedError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <CrmStatCard
          label="Registros CRM"
          value={globalStats.total}
          hint="Valores auxiliares expuestos por backend."
          icon={Search}
          tone="blue"
        />
        <CrmStatCard
          label="Activos"
          value={globalStats.activos}
          hint="Códigos disponibles para operación diaria."
          icon={ToggleRight}
          tone="emerald"
        />
        <CrmStatCard
          label="Inactivos"
          value={globalStats.inactivos}
          hint="Valores reservados o fuera de uso operativo."
          icon={ToggleLeft}
          tone="amber"
        />
      </div>

      <Card className={crmPanelClassName}>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por código o descripción..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as CatalogKey)}>
        <TabsList>
          <TabsTrigger value="tipos">Tipos comunicado</TabsTrigger>
          <TabsTrigger value="motivos">Motivos</TabsTrigger>
          <TabsTrigger value="intereses">Intereses</TabsTrigger>
        </TabsList>

        {(Object.keys(catalogLabels) as CatalogKey[]).map((kind) => {
          const catalog = catalogs[kind]
          const visibleRows = kind === activeTab ? filtered : catalog.items

          return (
            <TabsContent key={kind} value={kind}>
              <Card className={crmPanelClassName}>
                <CardHeader>
                  <CardTitle>{catalogLabels[kind].title}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {catalog.loading && visibleRows.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                            Cargando {catalogLabels[kind].title.toLowerCase()}...
                          </TableCell>
                        </TableRow>
                      )}
                      {!catalog.loading && visibleRows.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                            No hay registros para este catálogo.
                          </TableCell>
                        </TableRow>
                      )}
                      {visibleRows.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.codigo}</TableCell>
                          <TableCell>{item.descripcion}</TableCell>
                          <TableCell>
                            <Badge variant={item.activo ? "secondary" : "outline"}>
                              {item.activo ? "Activo" : "Inactivo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEdit(kind, item)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleStatus(kind, item)}
                              >
                                {item.activo ? (
                                  <ToggleRight className="h-4 w-4 text-emerald-600" />
                                ) : (
                                  <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          )
        })}
      </Tabs>

      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open)
          if (!open) resetForm()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing
                ? `Editar ${catalogLabels[editing.kind].singular}`
                : `Nuevo ${catalogLabels[activeTab].singular}`}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "El backend permite modificar la descripción y cambiar el estado activo."
                : "Completa código y descripción para crear un nuevo valor de catálogo."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="codigo">Código</Label>
              <Input
                id="codigo"
                value={formData.codigo}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, codigo: event.target.value }))
                }
                disabled={Boolean(editing)}
                placeholder="Ej. MAILING"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Input
                id="descripcion"
                value={formData.descripcion}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, descripcion: event.target.value }))
                }
                placeholder="Descripción visible"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={submit}
              disabled={(!editing && !formData.codigo.trim()) || !formData.descripcion.trim()}
            >
              {editing ? "Guardar cambios" : "Crear registro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function CatalogosCrmPage() {
  return (
    <Suspense fallback={null}>
      <CatalogosCrmContent />
    </Suspense>
  )
}
