"use client"

import { useMemo, useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  Trophy,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useItemsCatalogSnapshot, useMarcas } from "@/lib/hooks/useInventarioMaestros"
import type { Item, MarcaComercial } from "@/lib/types/items"

type BrandFormState = {
  descripcion: string
}

function emptyForm(): BrandFormState {
  return {
    descripcion: "",
  }
}

function formFromBrand(brand: MarcaComercial): BrandFormState {
  return {
    descripcion: brand.descripcion,
  }
}

function getBrandBadge(activo: boolean) {
  if (activo) return <Badge>Activa</Badge>
  return <Badge variant="outline">Inactiva</Badge>
}

export default function MarcasInventarioPage() {
  const { marcas, loading, saving, error, crear, actualizar, cambiarEstado, refetch } = useMarcas()
  const { items, loading: loadingItems, error: itemsError } = useItemsCatalogSnapshot()
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState<BrandFormState>(emptyForm())
  const [formError, setFormError] = useState<string | null>(null)
  const [savingForm, setSavingForm] = useState(false)
  const [changingState, setChangingState] = useState(false)

  const usageByBrand = useMemo(() => {
    const usage = new Map<number, Item[]>()

    items.forEach((item) => {
      if (!item.marcaId) {
        return
      }

      const existing = usage.get(item.marcaId) ?? []
      existing.push(item)
      usage.set(item.marcaId, existing)
    })

    return usage
  }, [items])

  const visibleBrands = useMemo(() => {
    const term = search.trim().toLowerCase()

    return marcas
      .map((marca) => ({
        marca,
        linkedItems: usageByBrand.get(marca.id) ?? [],
      }))
      .filter((entry) => {
        if (!term) return true

        return (
          entry.marca.descripcion.toLowerCase().includes(term) ||
          entry.linkedItems.some(
            (item) =>
              item.codigo.toLowerCase().includes(term) ||
              item.descripcion.toLowerCase().includes(term)
          )
        )
      })
      .sort(
        (left, right) =>
          right.linkedItems.length - left.linkedItems.length ||
          left.marca.descripcion.localeCompare(right.marca.descripcion)
      )
  }, [marcas, search, usageByBrand])

  const effectiveSelectedId = visibleBrands.some((entry) => entry.marca.id === selectedId)
    ? selectedId
    : (visibleBrands[0]?.marca.id ?? null)

  const highlighted =
    visibleBrands.find((entry) => entry.marca.id === effectiveSelectedId) ??
    visibleBrands[0] ??
    null
  const brandToDelete = deleteId ? (marcas.find((marca) => marca.id === deleteId) ?? null) : null
  const marcasVisibles = visibleBrands.length
  const marcasConUso = visibleBrands.filter((entry) => entry.linkedItems.length > 0).length
  const itemsConMarca = visibleBrands.reduce((total, entry) => total + entry.linkedItems.length, 0)
  const marcasInactivas = visibleBrands.filter((entry) => !entry.marca.activo).length

  const pageError = error ?? itemsError

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setFormError(null)
    setDialogOpen(true)
  }

  const openEdit = (brand: MarcaComercial) => {
    setSelectedId(brand.id)
    setEditingId(brand.id)
    setForm(formFromBrand(brand))
    setFormError(null)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.descripcion.trim()) {
      setFormError("Completa la descripcion de la marca para guardar.")
      return
    }

    const duplicate = marcas.find(
      (marca) =>
        marca.id !== editingId &&
        marca.descripcion.trim().toLowerCase() === form.descripcion.trim().toLowerCase()
    )

    if (duplicate) {
      setFormError("Ya existe otra marca con la misma descripcion.")
      return
    }

    setSavingForm(true)
    setFormError(null)

    const ok = editingId
      ? await actualizar(editingId, { descripcion: form.descripcion.trim() })
      : await crear({ descripcion: form.descripcion.trim() })

    if (!ok) {
      setFormError(editingId ? "No se pudo actualizar la marca." : "No se pudo crear la marca.")
      setSavingForm(false)
      return
    }

    await refetch()
    setSavingForm(false)
    setDialogOpen(false)
    setEditingId(null)
    setForm(emptyForm())
  }

  const handleChangeState = async (brand: MarcaComercial, activo: boolean) => {
    setChangingState(true)
    await cambiarEstado(brand.id, activo)
    setChangingState(false)
    if (!activo && selectedId === brand.id) {
      setSelectedId(null)
    }
    if (activo) {
      setSelectedId(brand.id)
    }
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marcas</h1>
          <p className="mt-1 text-muted-foreground">
            Maestro de marcas conectado al backend real, con lectura de uso sobre el catalogo activo
            de inventario comercial.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="bg-transparent" onClick={() => void refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Actualizar
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Nueva marca
          </Button>
        </div>
      </div>

      {pageError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Marcas</AlertTitle>
          <AlertDescription>{pageError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Marcas visibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{marcasVisibles}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Catalogo real publicado por backend
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Con uso real</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{marcasConUso}</div>
            <p className="mt-1 text-xs text-muted-foreground">Marcas asociadas a items activos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Items con marca</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{itemsConMarca}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Cobertura visible del catalogo activo
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Marcas inactivas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{marcasInactivas}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Bajas logicas preservadas por trazabilidad
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Catalogo de marcas</CardTitle>
            <CardDescription>
              Maestro real de marcas. Los campos extendidos del legacy quedan pendientes hasta que
              el contrato los publique.
            </CardDescription>
            <div className="relative mt-2 max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar marca o item asociado..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading || loadingItems ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Cargando marcas...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Marca</TableHead>
                    <TableHead>Uso real</TableHead>
                    <TableHead>Items vinculados</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleBrands.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        No se encontraron marcas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleBrands.map((entry) => (
                      <TableRow
                        key={entry.marca.id}
                        className={
                          highlighted?.marca.id === entry.marca.id ? "bg-accent/40" : undefined
                        }
                        onClick={() => setSelectedId(entry.marca.id)}
                      >
                        <TableCell>
                          <div className="font-medium">{entry.marca.descripcion}</div>
                          <div className="text-xs text-muted-foreground">ID {entry.marca.id}</div>
                        </TableCell>
                        <TableCell>
                          {entry.linkedItems.length > 0 ? (
                            <Badge variant="secondary" className="bg-green-500/10 text-green-700">
                              En catalogo
                            </Badge>
                          ) : (
                            <Badge variant="outline">Sin uso visible</Badge>
                          )}
                        </TableCell>
                        <TableCell>{entry.linkedItems.length}</TableCell>
                        <TableCell>{getBrandBadge(entry.marca.activo)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {!entry.marca.activo && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => void handleChangeState(entry.marca, true)}
                                disabled={changingState || saving}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(entry.marca)}
                              disabled={!entry.marca.activo}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(entry.marca.id)}
                              disabled={!entry.marca.activo}
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
              <CardTitle>Marca destacada</CardTitle>
              <CardDescription>
                Lectura rapida del impacto real dentro del catalogo visible.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {highlighted ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{highlighted.marca.descripcion}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        ID {highlighted.marca.id}
                      </p>
                    </div>
                    {getBrandBadge(highlighted.marca.activo)}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">Items activos</p>
                      <p className="mt-2 font-medium">{highlighted.linkedItems.length}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">Cobertura</p>
                      <p className="mt-2 font-medium">
                        {highlighted.linkedItems.length > 0
                          ? "En uso comercial"
                          : "Pendiente de adopcion"}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
                    {highlighted.linkedItems.length > 0
                      ? `Los primeros items asociados son ${highlighted.linkedItems
                          .slice(0, 3)
                          .map((item) => item.descripcion)
                          .join(", ")}.`
                      : "La marca existe en el maestro, pero todavia no tiene articulos activos asociados en el catalogo visible."}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No hay marcas visibles.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="h-4 w-4" /> Marcas mas utilizadas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {visibleBrands.slice(0, 3).map((entry) => (
                <div key={entry.marca.id} className="rounded-lg border p-4">
                  <p className="font-medium">{entry.marca.descripcion}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {entry.linkedItems.length} items activos vinculados
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldAlert className="h-4 w-4" /> Criterio actual
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              El CRUD ya opera sobre el backend real de marcas. Los metadatos ampliados que el
              legacy manejaba fuera de la tabla base siguen pendientes de contrato.
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar marca" : "Nueva marca"}</DialogTitle>
            <DialogDescription>
              Alta y edicion del maestro real de marcas utilizado por los items de inventario.
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
                placeholder="Marca comercial"
              />
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
            <Button onClick={() => void handleSave()} disabled={savingForm || saving}>
              {savingForm || saving
                ? "Guardando..."
                : editingId
                  ? "Guardar cambios"
                  : "Crear marca"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(brandToDelete)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desactivar marca</DialogTitle>
            <DialogDescription>
              La marca se marcara como inactiva. Los items que la referencian conservaran la traza
              historica.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            {brandToDelete ? brandToDelete.descripcion : "Sin marca seleccionada."}
          </div>
          <DialogFooter>
            <Button variant="outline" className="bg-transparent" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => brandToDelete && void handleChangeState(brandToDelete, false)}
              disabled={changingState || saving}
            >
              {changingState ? "Desactivando..." : "Desactivar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
