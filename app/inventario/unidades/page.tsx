"use client"

import { useMemo, useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  Pencil,
  Plus,
  RefreshCw,
  Ruler,
  Search,
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
import { useItemsCatalogSnapshot, useUnidadesMedida } from "@/lib/hooks/useInventarioMaestros"
import type { UnidadMedida } from "@/lib/types/items"

type UnitFormState = {
  codigo: string
  descripcion: string
  disminutivo: string
  multiplicador: string
  esUnidadBase: boolean
  unidadBaseId: string
}

function emptyForm(): UnitFormState {
  return {
    codigo: "",
    descripcion: "",
    disminutivo: "",
    multiplicador: "1",
    esUnidadBase: true,
    unidadBaseId: "",
  }
}

function formFromUnit(unit: UnidadMedida): UnitFormState {
  return {
    codigo: unit.codigo,
    descripcion: unit.descripcion,
    disminutivo: unit.disminutivo ?? "",
    multiplicador: String(unit.multiplicador ?? 1),
    esUnidadBase: unit.esUnidadBase ?? true,
    unidadBaseId: unit.unidadBaseId ? String(unit.unidadBaseId) : "",
  }
}

function stateBadge(activa: boolean) {
  if (activa) return <Badge>Activa</Badge>
  return <Badge variant="outline">Inactiva</Badge>
}

function kindBadge(unit: UnidadMedida) {
  if (unit.esUnidadBase) return <Badge variant="secondary">Base</Badge>
  return <Badge variant="outline">Derivada</Badge>
}

export default function UnidadesInventarioPage() {
  const { unidades, loading, saving, error, crear, actualizar, cambiarEstado, refetch } =
    useUnidadesMedida()
  const { items, loading: loadingItems, error: itemsError } = useItemsCatalogSnapshot()
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState<UnitFormState>(emptyForm())
  const [formError, setFormError] = useState<string | null>(null)

  const usageByUnit = useMemo(() => {
    const linkedItems = new Map<number, typeof items>()
    const usedAsBase = new Map<number, number>()

    items.forEach((item) => {
      const existing = linkedItems.get(item.unidadMedidaId) ?? []
      existing.push(item)
      linkedItems.set(item.unidadMedidaId, existing)
    })

    unidades.forEach((unit) => {
      if (!unit.unidadBaseId) {
        return
      }

      usedAsBase.set(unit.unidadBaseId, (usedAsBase.get(unit.unidadBaseId) ?? 0) + 1)
    })

    return {
      linkedItems,
      usedAsBase,
    }
  }, [items, unidades])

  const visibleUnits = useMemo(() => {
    const term = search.trim().toLowerCase()

    return unidades
      .map((unit) => ({
        unit,
        linkedItems: usageByUnit.linkedItems.get(unit.id) ?? [],
        usedAsBase: usageByUnit.usedAsBase.get(unit.id) ?? 0,
      }))
      .filter((entry) => {
        if (!term) return true

        return (
          entry.unit.descripcion.toLowerCase().includes(term) ||
          entry.unit.codigo.toLowerCase().includes(term) ||
          (entry.unit.disminutivo ?? "").toLowerCase().includes(term)
        )
      })
      .sort(
        (left, right) =>
          right.linkedItems.length - left.linkedItems.length ||
          left.unit.descripcion.localeCompare(right.unit.descripcion)
      )
  }, [search, unidades, usageByUnit])

  const effectiveSelectedId = visibleUnits.some((entry) => entry.unit.id === selectedId)
    ? selectedId
    : (visibleUnits[0]?.unit.id ?? null)

  const highlighted =
    visibleUnits.find((entry) => entry.unit.id === effectiveSelectedId) ?? visibleUnits[0] ?? null
  const unitToDelete = deleteId ? (unidades.find((unit) => unit.id === deleteId) ?? null) : null
  const activeUnits = visibleUnits.filter((entry) => entry.unit.activa).length
  const unitsInUse = visibleUnits.filter((entry) => entry.linkedItems.length > 0).length
  const derivedUnits = visibleUnits.filter((entry) => !entry.unit.esUnidadBase).length
  const inactiveUnits = visibleUnits.filter((entry) => !entry.unit.activa).length
  const pageError = error ?? itemsError

  const baseUnitOptions = unidades.filter(
    (unit) => unit.activa && unit.esUnidadBase && unit.id !== editingId
  )

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setFormError(null)
    setDialogOpen(true)
  }

  const openEdit = (unit: UnidadMedida) => {
    setSelectedId(unit.id)
    setEditingId(unit.id)
    setForm(formFromUnit(unit))
    setFormError(null)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    const multiplicador = Number(form.multiplicador.replace(",", "."))

    if (!editingId && !form.codigo.trim()) {
      setFormError("Completa el codigo de la unidad para crearla.")
      return
    }

    if (!form.descripcion.trim()) {
      setFormError("Completa la descripcion de la unidad.")
      return
    }

    if (!Number.isFinite(multiplicador) || multiplicador <= 0) {
      setFormError("El multiplicador debe ser un numero mayor a cero.")
      return
    }

    if (!form.esUnidadBase && !form.unidadBaseId) {
      setFormError("Selecciona la unidad base de referencia para la unidad derivada.")
      return
    }

    const duplicateCode = unidades.find(
      (unit) =>
        unit.id !== editingId &&
        unit.codigo.trim().toLowerCase() === form.codigo.trim().toLowerCase()
    )

    if (!editingId && duplicateCode) {
      setFormError("Ya existe otra unidad con el mismo codigo.")
      return
    }

    const duplicateDescription = unidades.find(
      (unit) =>
        unit.id !== editingId &&
        unit.descripcion.trim().toLowerCase() === form.descripcion.trim().toLowerCase()
    )

    if (duplicateDescription) {
      setFormError("Ya existe otra unidad con la misma descripcion.")
      return
    }

    const payload = {
      descripcion: form.descripcion.trim(),
      disminutivo: form.disminutivo.trim() || null,
      multiplicador,
      esUnidadBase: form.esUnidadBase,
      unidadBaseId: form.esUnidadBase ? null : Number(form.unidadBaseId),
    }

    const ok = editingId
      ? await actualizar(editingId, payload)
      : await crear({
          codigo: form.codigo.trim(),
          ...payload,
        })

    if (!ok) {
      setFormError(editingId ? "No se pudo actualizar la unidad." : "No se pudo crear la unidad.")
      return
    }

    setDialogOpen(false)
    setEditingId(null)
    setForm(emptyForm())
  }

  const handleChangeState = async (unit: UnidadMedida, activa: boolean) => {
    const ok = await cambiarEstado(unit.id, activa)
    if (ok) {
      setDeleteId(null)
      setSelectedId(unit.id)
    }
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Unidades</h1>
          <p className="mt-1 text-muted-foreground">
            Maestro real de unidades de medida, con cobertura operativa sobre los items activos del
            inventario comercial.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="bg-transparent" onClick={() => void refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Actualizar
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Nueva unidad
          </Button>
        </div>
      </div>

      {pageError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unidades</AlertTitle>
          <AlertDescription>{pageError}</AlertDescription>
        </Alert>
      )}

      <Alert>
        <Ruler className="h-4 w-4" />
        <AlertTitle>Contrato activo</AlertTitle>
        <AlertDescription>
          El codigo se define solo al alta porque el backend de actualizacion no lo expone. Las
          unidades derivadas se vinculan contra una unidad base real.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUnits}</div>
            <p className="mt-1 text-xs text-muted-foreground">Unidades disponibles para operar</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Con uso real</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unitsInUse}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Unidades referenciadas por items activos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Derivadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{derivedUnits}</div>
            <p className="mt-1 text-xs text-muted-foreground">Unidades dependientes de una base</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Inactivas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{inactiveUnits}</div>
            <p className="mt-1 text-xs text-muted-foreground">Bajas logicas visibles</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Catalogo de unidades</CardTitle>
            <CardDescription>
              Maestro real de unidades y su uso efectivo dentro del catalogo activo.
            </CardDescription>
            <div className="relative mt-2 max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por codigo, descripcion o disminutivo..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading || loadingItems ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Cargando unidades...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Unidad</TableHead>
                    <TableHead>Codigo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Multiplicador</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleUnits.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        No se encontraron unidades.
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleUnits.map((entry) => (
                      <TableRow
                        key={entry.unit.id}
                        className={
                          highlighted?.unit.id === entry.unit.id ? "bg-accent/40" : undefined
                        }
                        onClick={() => setSelectedId(entry.unit.id)}
                      >
                        <TableCell>
                          <div className="font-medium">{entry.unit.descripcion}</div>
                          <div className="text-xs text-muted-foreground">ID {entry.unit.id}</div>
                        </TableCell>
                        <TableCell>{entry.unit.codigo}</TableCell>
                        <TableCell>{kindBadge(entry.unit)}</TableCell>
                        <TableCell>{entry.unit.multiplicador ?? 1}</TableCell>
                        <TableCell>{entry.linkedItems.length}</TableCell>
                        <TableCell>{stateBadge(entry.unit.activa ?? true)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {!(entry.unit.activa ?? true) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => void handleChangeState(entry.unit, true)}
                                disabled={saving}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(entry.unit)}
                              disabled={!(entry.unit.activa ?? true) || saving}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(entry.unit.id)}
                              disabled={!(entry.unit.activa ?? true) || saving}
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
              <CardTitle>Unidad destacada</CardTitle>
              <CardDescription>Resumen operativo de la unidad seleccionada.</CardDescription>
            </CardHeader>
            <CardContent>
              {highlighted ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{highlighted.unit.descripcion}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {highlighted.unit.codigo}
                      </p>
                    </div>
                    {stateBadge(highlighted.unit.activa ?? true)}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {kindBadge(highlighted.unit)}
                    <Badge variant="outline">
                      {highlighted.unit.disminutivo?.trim() || "Sin disminutivo"}
                    </Badge>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">Items activos</p>
                      <p className="mt-2 font-medium">{highlighted.linkedItems.length}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">Usada como base</p>
                      <p className="mt-2 font-medium">{highlighted.usedAsBase}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">Multiplicador</p>
                      <p className="mt-2 font-medium">{highlighted.unit.multiplicador ?? 1}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">Base de referencia</p>
                      <p className="mt-2 font-medium">
                        {highlighted.unit.esUnidadBase
                          ? "Es unidad base"
                          : (unidades.find((unit) => unit.id === highlighted.unit.unidadBaseId)
                              ?.descripcion ?? "Sin referencia")}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
                    {highlighted.linkedItems.length > 0
                      ? `Se observa en ${highlighted.linkedItems
                          .slice(0, 3)
                          .map((item) => item.descripcion)
                          .join(", ")}.`
                      : "La unidad existe en el maestro, pero todavia no se ve asociada a items activos del catalogo cargado."}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No hay unidades visibles.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Criterio vigente</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              El maestro ya opera sobre el backend real. Las relaciones entre unidad base y derivada
              quedan visibles sin depender de overlays heredados.
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar unidad" : "Nueva unidad"}</DialogTitle>
            <DialogDescription>
              Crea o edita una unidad de medida del maestro real. El codigo solo puede definirse al
              crear.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="codigo">Codigo</Label>
                <Input
                  id="codigo"
                  value={form.codigo}
                  onChange={(event) => setForm((prev) => ({ ...prev, codigo: event.target.value }))}
                  placeholder="Ej. UN, KG, LT"
                  disabled={Boolean(editingId)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripcion</Label>
                <Input
                  id="descripcion"
                  value={form.descripcion}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, descripcion: event.target.value }))
                  }
                  placeholder="Unidad de medida"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="disminutivo">Disminutivo</Label>
                <Input
                  id="disminutivo"
                  value={form.disminutivo}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, disminutivo: event.target.value }))
                  }
                  placeholder="Abreviatura opcional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="multiplicador">Multiplicador</Label>
                <Input
                  id="multiplicador"
                  value={form.multiplicador}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, multiplicador: event.target.value }))
                  }
                  placeholder="1"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo de unidad</Label>
                <Select
                  value={form.esUnidadBase ? "base" : "derivada"}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      esUnidadBase: value === "base",
                      unidadBaseId: value === "base" ? "" : prev.unidadBaseId,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="base">Unidad base</SelectItem>
                    <SelectItem value="derivada">Unidad derivada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!form.esUnidadBase && (
                <div className="space-y-2">
                  <Label>Unidad base de referencia</Label>
                  <Select
                    value={form.unidadBaseId || "__none__"}
                    onValueChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        unidadBaseId: value === "__none__" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar unidad base" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Seleccionar...</SelectItem>
                      {baseUnitOptions.map((unit) => (
                        <SelectItem key={unit.id} value={String(unit.id)}>
                          {unit.descripcion} ({unit.codigo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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
              {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear unidad"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(unitToDelete)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desactivar unidad</DialogTitle>
            <DialogDescription>
              La unidad quedara inactiva para nuevas altas, preservando las referencias historicas
              existentes.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            {unitToDelete ? unitToDelete.descripcion : "Sin unidad seleccionada."}
          </div>
          <DialogFooter>
            <Button variant="outline" className="bg-transparent" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => unitToDelete && void handleChangeState(unitToDelete, false)}
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
