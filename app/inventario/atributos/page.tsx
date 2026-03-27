"use client"

import { useMemo, useState } from "react"
import { Pencil, Plus, RefreshCcw, Search, ShieldCheck, Trash2 } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { Textarea } from "@/components/ui/textarea"
import { legacyAttributeSets, type LegacyAttributeSet } from "@/lib/inventario-legacy-data"
import { useLegacyLocalCollection } from "@/lib/hooks/useLegacyLocalCollection"
import { useItems, useItemsConfig } from "@/lib/hooks/useItems"

const ATTRIBUTES_STORAGE_KEY = "inventory-attributes-local-overlay"

type AttributeFormState = {
  nombre: string
  alcance: LegacyAttributeSet["alcance"]
  categoria: string
  obligatorios: string
  opcionales: string
  validacion: string
  observacion: string
}

function emptyForm(): AttributeFormState {
  return {
    nombre: "",
    alcance: "catalogo",
    categoria: "",
    obligatorios: "",
    opcionales: "",
    validacion: "",
    observacion: "",
  }
}

function formFromAttribute(row: LegacyAttributeSet): AttributeFormState {
  return {
    nombre: row.nombre,
    alcance: row.alcance,
    categoria: row.categoria,
    obligatorios: row.obligatorios.join(", "),
    opcionales: row.opcionales.join(", "),
    validacion: row.validacion,
    observacion: row.observacion,
  }
}

function scopeBadge(scope: string) {
  if (scope === "fiscal") return <Badge variant="secondary">Fiscal</Badge>
  if (scope === "logistica") return <Badge>Logistica</Badge>
  if (scope === "produccion") return <Badge variant="outline">Produccion</Badge>
  return <Badge variant="secondary">Catalogo</Badge>
}

export default function AtributosInventarioPage() {
  const { items } = useItems()
  const { categorias } = useItemsConfig()
  const {
    rows: attributeRows,
    setRows,
    reset,
  } = useLegacyLocalCollection<LegacyAttributeSet>(ATTRIBUTES_STORAGE_KEY, legacyAttributeSets)
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(attributeRows[0]?.id ?? null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<AttributeFormState>(emptyForm())
  const [formError, setFormError] = useState<string | null>(null)

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    return attributeRows.filter(
      (row) =>
        !term ||
        row.nombre.toLowerCase().includes(term) ||
        row.categoria.toLowerCase().includes(term) ||
        row.alcance.toLowerCase().includes(term)
    )
  }, [attributeRows, search])

  const highlighted = rows.find((row) => row.id === selectedId) ?? rows[0] ?? null

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setFormError(null)
    setDialogOpen(true)
  }

  const openEdit = (row: LegacyAttributeSet) => {
    setEditingId(row.id)
    setForm(formFromAttribute(row))
    setFormError(null)
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!form.nombre.trim() || !form.categoria.trim() || !form.validacion.trim()) {
      setFormError("Completá nombre, categoría y validación para guardar el bloque.")
      return
    }

    const next: LegacyAttributeSet = {
      id: editingId ?? `attr-local-${Date.now()}`,
      nombre: form.nombre.trim(),
      alcance: form.alcance,
      categoria: form.categoria.trim(),
      obligatorios: form.obligatorios
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      opcionales: form.opcionales
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      validacion: form.validacion.trim(),
      observacion: form.observacion.trim() || "Sin observación adicional.",
    }

    setRows((prev) => {
      const rest = prev.filter((row) => row.id !== next.id)
      return [...rest, next].sort((left, right) => left.nombre.localeCompare(right.nombre))
    })
    setSelectedId(next.id)
    setDialogOpen(false)
  }

  const handleDelete = (id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id))
    if (selectedId === id) {
      setSelectedId(null)
    }
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Atributos</h1>
          <p className="mt-1 text-muted-foreground">
            Bloques de atributos y validaciones heredadas para el maestro de ítems. Mientras no
            exista backend de familias dinámicas, el frontend mantiene un overlay local operativo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="bg-transparent" onClick={() => reset()}>
            <RefreshCcw className="mr-2 h-4 w-4" /> Restablecer overlay
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo bloque
          </Button>
        </div>
      </div>

      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertDescription>
          Las familias de atributos siguen fuera del contrato actual. Esta pantalla permite mantener
          bloques, validaciones y listas de campos en frontend sin inventar endpoints.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Familias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rows.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Campos obligatorios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rows.reduce((sum, row) => sum + row.obligatorios.length, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Items actuales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Categorias reales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categorias.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Matriz de atributos</CardTitle>
            <CardDescription>
              Replica los bloques funcionales que el legacy separaba por dominio.
            </CardDescription>
            <div className="relative mt-2 max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar bloque de atributos..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bloque</TableHead>
                  <TableHead>Alcance</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Obligatorios</TableHead>
                  <TableHead>Opcionales</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={highlighted?.id === row.id ? "bg-accent/40" : undefined}
                  >
                    <TableCell className="font-medium" onClick={() => setSelectedId(row.id)}>
                      {row.nombre}
                    </TableCell>
                    <TableCell onClick={() => setSelectedId(row.id)}>
                      {scopeBadge(row.alcance)}
                    </TableCell>
                    <TableCell onClick={() => setSelectedId(row.id)}>{row.categoria}</TableCell>
                    <TableCell onClick={() => setSelectedId(row.id)}>
                      {row.obligatorios.length}
                    </TableCell>
                    <TableCell onClick={() => setSelectedId(row.id)}>
                      {row.opcionales.length}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(row)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(row.id)}>
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

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bloque destacado</CardTitle>
              <CardDescription>Validacion principal de la vista visible.</CardDescription>
            </CardHeader>
            <CardContent>
              {highlighted ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{highlighted.nombre}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{highlighted.validacion}</p>
                    </div>
                    {scopeBadge(highlighted.alcance)}
                  </div>
                  <div className="rounded-lg border p-4 text-sm">
                    <p className="font-medium">Obligatorios</p>
                    <p className="mt-2 text-muted-foreground">
                      {highlighted.obligatorios.join(" · ")}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                    {highlighted.observacion}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No hay atributos visibles.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4" /> Criterio de implementacion
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              La pantalla documenta familias y validaciones del legacy sin inventar endpoints de
              atributos dinámicos. El overlay local deja operativo el maestro funcional pendiente.
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar bloque de atributos" : "Nuevo bloque de atributos"}
            </DialogTitle>
            <DialogDescription>
              Alta y edición local de familias y validaciones para el catálogo de ítems.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={form.nombre}
                  onChange={(event) => setForm((prev) => ({ ...prev, nombre: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoría</Label>
                <Input
                  id="categoria"
                  value={form.categoria}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, categoria: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="alcance">Alcance</Label>
              <Select
                value={form.alcance}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, alcance: value as LegacyAttributeSet["alcance"] }))
                }
              >
                <SelectTrigger id="alcance" className="w-full">
                  <SelectValue placeholder="Seleccionar alcance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="catalogo">Catálogo</SelectItem>
                  <SelectItem value="logistica">Logística</SelectItem>
                  <SelectItem value="fiscal">Fiscal</SelectItem>
                  <SelectItem value="produccion">Producción</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="obligatorios">Obligatorios</Label>
              <Input
                id="obligatorios"
                value={form.obligatorios}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, obligatorios: event.target.value }))
                }
                placeholder="código interno, unidad, iva"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="opcionales">Opcionales</Label>
              <Input
                id="opcionales"
                value={form.opcionales}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, opcionales: event.target.value }))
                }
                placeholder="ean, marca, origen"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="validacion">Validación</Label>
              <Textarea
                id="validacion"
                rows={3}
                value={form.validacion}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, validacion: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="observacion">Observación</Label>
              <Textarea
                id="observacion"
                rows={3}
                value={form.observacion}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, observacion: event.target.value }))
                }
              />
            </div>
            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Guardar bloque</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
