"use client"

import { useMemo, useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { useAtributos, useItemsCatalogSnapshot } from "@/lib/hooks/useInventarioMaestros"
import type { AtributoInventario, Item } from "@/lib/types/items"

type AttributeFormState = {
  descripcion: string
  tipo: string
  requerido: boolean
}

function emptyForm(): AttributeFormState {
  return {
    descripcion: "",
    tipo: "texto",
    requerido: false,
  }
}

function formFromAttribute(attribute: AtributoInventario): AttributeFormState {
  return {
    descripcion: attribute.descripcion,
    tipo: attribute.tipo,
    requerido: attribute.requerido,
  }
}

function typeBadge(tipo: string) {
  const normalized = tipo.trim().toLowerCase()

  if (normalized === "numero" || normalized === "decimal" || normalized === "entero") {
    return <Badge variant="secondary">Numerico</Badge>
  }

  if (normalized === "fecha") {
    return <Badge>Fecha</Badge>
  }

  if (normalized === "booleano" || normalized === "bool") {
    return <Badge variant="outline">Booleano</Badge>
  }

  if (normalized === "lista") {
    return <Badge variant="outline">Lista</Badge>
  }

  return <Badge variant="secondary">{tipo || "Texto"}</Badge>
}

function requiredBadge(requerido: boolean) {
  if (requerido) return <Badge>Obligatorio</Badge>
  return <Badge variant="outline">Opcional</Badge>
}

function stateBadge(activo: boolean) {
  if (activo) return <Badge>Activo</Badge>
  return <Badge variant="outline">Inactivo</Badge>
}

export default function AtributosInventarioPage() {
  const { atributos, loading, saving, error, crear, actualizar, cambiarEstado, refetch } =
    useAtributos()
  const { items, loading: loadingItems, error: itemsError } = useItemsCatalogSnapshot()
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState<AttributeFormState>(emptyForm())
  const [formError, setFormError] = useState<string | null>(null)

  const usageByAttribute = useMemo(() => {
    const linkedItems = new Map<number, Item[]>()
    const linkedValues = new Map<number, number>()
    let hasItemPayload = false

    items.forEach((item) => {
      if (!Array.isArray(item.atributos)) {
        return
      }

      hasItemPayload = true
      const seenOnItem = new Set<number>()

      item.atributos.forEach((atributo) => {
        linkedValues.set(atributo.atributoId, (linkedValues.get(atributo.atributoId) ?? 0) + 1)

        if (seenOnItem.has(atributo.atributoId)) {
          return
        }

        const existing = linkedItems.get(atributo.atributoId) ?? []
        existing.push(item)
        linkedItems.set(atributo.atributoId, existing)
        seenOnItem.add(atributo.atributoId)
      })
    })

    return {
      linkedItems,
      linkedValues,
      hasItemPayload,
    }
  }, [items])

  const visibleAttributes = useMemo(() => {
    const term = search.trim().toLowerCase()

    return atributos
      .map((atributo) => ({
        atributo,
        linkedItems: usageByAttribute.linkedItems.get(atributo.id) ?? [],
        linkedValues: usageByAttribute.linkedValues.get(atributo.id) ?? 0,
      }))
      .filter((entry) => {
        if (!term) return true

        return (
          entry.atributo.descripcion.toLowerCase().includes(term) ||
          entry.atributo.tipo.toLowerCase().includes(term) ||
          (entry.atributo.requerido ? "obligatorio" : "opcional").includes(term)
        )
      })
      .sort(
        (left, right) =>
          right.linkedItems.length - left.linkedItems.length ||
          left.atributo.descripcion.localeCompare(right.atributo.descripcion)
      )
  }, [atributos, search, usageByAttribute])

  const effectiveSelectedId = visibleAttributes.some((entry) => entry.atributo.id === selectedId)
    ? selectedId
    : (visibleAttributes[0]?.atributo.id ?? null)

  const highlighted =
    visibleAttributes.find((entry) => entry.atributo.id === effectiveSelectedId) ??
    visibleAttributes[0] ??
    null
  const attributeToDelete = deleteId
    ? (atributos.find((atributo) => atributo.id === deleteId) ?? null)
    : null
  const hasSearchFilter = search.trim().length > 0
  const requiredCount = visibleAttributes.filter((entry) => entry.atributo.requerido).length
  const inactiveCount = visibleAttributes.filter((entry) => !entry.atributo.activo).length
  const typeCount = new Set(
    visibleAttributes.map((entry) => entry.atributo.tipo.trim().toLowerCase()).filter(Boolean)
  ).size
  const pageError = error ?? itemsError

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setFormError(null)
    setDialogOpen(true)
  }

  const openEdit = (attribute: AtributoInventario) => {
    setSelectedId(attribute.id)
    setEditingId(attribute.id)
    setForm(formFromAttribute(attribute))
    setFormError(null)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.descripcion.trim() || !form.tipo.trim()) {
      setFormError("Completa descripcion y tipo para guardar el atributo.")
      return
    }

    const duplicate = atributos.find(
      (atributo) =>
        atributo.id !== editingId &&
        atributo.descripcion.trim().toLowerCase() === form.descripcion.trim().toLowerCase()
    )

    if (duplicate) {
      setFormError("Ya existe otro atributo con la misma descripcion.")
      return
    }

    const payload = {
      descripcion: form.descripcion.trim(),
      tipo: form.tipo.trim(),
      requerido: form.requerido,
    }

    const ok = editingId ? await actualizar(editingId, payload) : await crear(payload)

    if (!ok) {
      setFormError(
        editingId ? "No se pudo actualizar el atributo." : "No se pudo crear el atributo."
      )
      return
    }

    setDialogOpen(false)
    setEditingId(null)
    setForm(emptyForm())
  }

  const handleChangeState = async (attribute: AtributoInventario, activo: boolean) => {
    const ok = await cambiarEstado(attribute.id, activo)
    if (ok) {
      setDeleteId(null)
      setSelectedId(attribute.id)
    }
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Atributos</h1>
          <p className="mt-1 text-muted-foreground">
            Maestro real de atributos de inventario. Los valores por item se administran desde el
            detalle del producto, no con overlays locales.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="bg-transparent" onClick={() => void refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Actualizar
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo atributo
          </Button>
        </div>
      </div>

      {pageError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Atributos</AlertTitle>
          <AlertDescription>{pageError}</AlertDescription>
        </Alert>
      )}

      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>Contrato activo</AlertTitle>
        <AlertDescription>
          Esta vista administra definiciones reales de atributos. La carga de valores por item ya
          queda cubierta en Productos con el endpoint de atributos por item.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Definiciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{visibleAttributes.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {hasSearchFilter
                ? "Definiciones visibles tras el filtro actual"
                : "Maestro publicado por backend"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Obligatorios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requiredCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {hasSearchFilter
                ? "Campos exigidos dentro de la vista actual"
                : "Campos exigidos en captura de datos"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tipos visibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{typeCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {hasSearchFilter
                ? "Variantes presentes en la vista actual"
                : "Variantes activas del contrato"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Inactivos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{inactiveCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {hasSearchFilter
                ? "Bajas lógicas visibles en el filtro"
                : "Bajas logicas conservadas"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Matriz de atributos</CardTitle>
            <CardDescription>
              Definiciones reales disponibles para los items. Se muestran activas e inactivas para
              preservar el comportamiento historico.
            </CardDescription>
            <div className="relative mt-2 max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por descripcion, tipo o requerimiento..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading || loadingItems ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Cargando atributos...
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Atributo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Requerido</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleAttributes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        No se encontraron atributos.
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleAttributes.map((entry) => (
                      <TableRow
                        key={entry.atributo.id}
                        className={
                          highlighted?.atributo.id === entry.atributo.id
                            ? "bg-accent/40"
                            : undefined
                        }
                        onClick={() => setSelectedId(entry.atributo.id)}
                      >
                        <TableCell>
                          <div className="font-medium">{entry.atributo.descripcion}</div>
                          <div className="text-xs text-muted-foreground">
                            ID {entry.atributo.id}
                          </div>
                        </TableCell>
                        <TableCell>{typeBadge(entry.atributo.tipo)}</TableCell>
                        <TableCell>{requiredBadge(entry.atributo.requerido)}</TableCell>
                        <TableCell>
                          {usageByAttribute.hasItemPayload ? entry.linkedItems.length : "-"}
                        </TableCell>
                        <TableCell>{stateBadge(entry.atributo.activo)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {!entry.atributo.activo && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => void handleChangeState(entry.atributo, true)}
                                disabled={saving}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(entry.atributo)}
                              disabled={!entry.atributo.activo || saving}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(entry.atributo.id)}
                              disabled={!entry.atributo.activo || saving}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Atributo destacado</CardTitle>
              <CardDescription>Detalle rapido del atributo seleccionado.</CardDescription>
            </CardHeader>
            <CardContent>
              {highlighted ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{highlighted.atributo.descripcion}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        ID {highlighted.atributo.id}
                      </p>
                    </div>
                    {stateBadge(highlighted.atributo.activo)}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {typeBadge(highlighted.atributo.tipo)}
                    {requiredBadge(highlighted.atributo.requerido)}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">Items visibles</p>
                      <p className="mt-2 font-medium">
                        {usageByAttribute.hasItemPayload
                          ? highlighted.linkedItems.length
                          : "No expuesto"}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">Valores visibles</p>
                      <p className="mt-2 font-medium">
                        {usageByAttribute.hasItemPayload
                          ? highlighted.linkedValues
                          : "Desde detalle"}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
                    {usageByAttribute.hasItemPayload
                      ? highlighted.linkedItems.length > 0
                        ? `Se observa en ${highlighted.linkedItems
                            .slice(0, 3)
                            .map((item) => item.descripcion)
                            .join(", ")}.`
                        : "No hay items activos visibles con este atributo cargado."
                      : "El backend publica la definicion del atributo; las asignaciones por item se consultan desde el detalle del producto."}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No hay atributos visibles.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Regla vigente</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Las altas y ediciones impactan directamente en el maestro de atributos. La carga de
              valores por item se mantiene en la ficha de productos para respetar el contrato
              actual.
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar atributo" : "Nuevo atributo"}</DialogTitle>
            <DialogDescription>
              Define el atributo que luego podra asignarse a los items desde la ficha de productos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripcion</Label>
              <Input
                id="descripcion"
                value={form.descripcion}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, descripcion: event.target.value }))
                }
                placeholder="Ej. Color, Lote, Fecha de vencimiento"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Input
                id="tipo"
                value={form.tipo}
                onChange={(event) => setForm((prev) => ({ ...prev, tipo: event.target.value }))}
                placeholder="texto, numero, fecha, booleano..."
              />
            </div>
            <div className="space-y-2">
              <Label>Requerido</Label>
              <Select
                value={form.requerido ? "true" : "false"}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, requerido: value === "true" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">Opcional</SelectItem>
                  <SelectItem value="true">Obligatorio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formError && <p className="text-sm text-red-500">{formError}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={() => setDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear atributo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(attributeToDelete)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desactivar atributo</DialogTitle>
            <DialogDescription>
              El atributo quedara inactivo para nuevas asignaciones, pero se mantendra la
              trazabilidad historica.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            {attributeToDelete ? attributeToDelete.descripcion : "Sin atributo seleccionado."}
          </div>
          <DialogFooter>
            <Button variant="outline" className="bg-transparent" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => attributeToDelete && void handleChangeState(attributeToDelete, false)}
              disabled={saving}
            >
              {saving ? "Desactivando..." : "Desactivar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
