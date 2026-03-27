"use client"

import { useMemo, useState } from "react"
import { Pencil, Plus, RefreshCcw, Search, ShieldAlert, Trash2, Trophy } from "lucide-react"

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
import { legacyInventoryBrands, type LegacyInventoryBrand } from "@/lib/inventario-legacy-data"
import { useLegacyLocalCollection } from "@/lib/hooks/useLegacyLocalCollection"
import { useItems, useItemsConfig } from "@/lib/hooks/useItems"

const BRANDS_STORAGE_KEY = "inventory-brands-local-overlay"

type BrandFormState = {
  nombre: string
  familia: string
  origen: string
  estado: LegacyInventoryBrand["estado"]
  catalogo: string
  lineas: string
  cobertura: string
  observacion: string
}

function emptyForm(): BrandFormState {
  return {
    nombre: "",
    familia: "",
    origen: "",
    estado: "activa",
    catalogo: "",
    lineas: "",
    cobertura: "",
    observacion: "",
  }
}

function formFromBrand(brand: LegacyInventoryBrand): BrandFormState {
  return {
    nombre: brand.nombre,
    familia: brand.familia,
    origen: brand.origen,
    estado: brand.estado,
    catalogo: String(brand.catalogo),
    lineas: brand.lineas.join(", "),
    cobertura: brand.cobertura,
    observacion: brand.observacion,
  }
}

function getBrandBadge(status: string) {
  if (status === "activa") return <Badge>Activa</Badge>
  if (status === "revision") return <Badge variant="secondary">En revision</Badge>
  return <Badge variant="outline">Descontinuada</Badge>
}

export default function MarcasInventarioPage() {
  const { items } = useItems()
  const { categorias } = useItemsConfig()
  const { rows, setRows, reset } = useLegacyLocalCollection<LegacyInventoryBrand>(
    BRANDS_STORAGE_KEY,
    legacyInventoryBrands
  )
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(rows[0]?.id ?? null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<BrandFormState>(emptyForm())
  const [formError, setFormError] = useState<string | null>(null)

  const visibleBrands = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows
    return rows.filter(
      (brand) =>
        brand.nombre.toLowerCase().includes(term) ||
        brand.familia.toLowerCase().includes(term) ||
        brand.cobertura.toLowerCase().includes(term)
    )
  }, [rows, search])

  const highlighted =
    visibleBrands.find((brand) => brand.id === selectedId) ?? visibleBrands[0] ?? null
  const totalCatalogo = visibleBrands.reduce((sum, brand) => sum + brand.catalogo, 0)
  const observadas = visibleBrands.filter((brand) => brand.estado !== "activa").length

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setFormError(null)
    setDialogOpen(true)
  }

  const openEdit = (brand: LegacyInventoryBrand) => {
    setEditingId(brand.id)
    setForm(formFromBrand(brand))
    setFormError(null)
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!form.nombre.trim() || !form.familia.trim()) {
      setFormError("Completá nombre y familia para guardar la marca.")
      return
    }

    const catalogo = Number.parseInt(form.catalogo, 10)
    if (Number.isNaN(catalogo) || catalogo < 0) {
      setFormError("El catálogo debe ser un número válido mayor o igual a cero.")
      return
    }

    const next: LegacyInventoryBrand = {
      id: editingId ?? `brand-local-${Date.now()}`,
      nombre: form.nombre.trim(),
      familia: form.familia.trim(),
      origen: form.origen.trim() || "No informado",
      estado: form.estado,
      catalogo,
      lineas: form.lineas
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      cobertura: form.cobertura.trim() || "Sin cobertura definida",
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
          <h1 className="text-3xl font-bold tracking-tight">Marcas</h1>
          <p className="mt-1 text-muted-foreground">
            Maestro visible de marcas y líneas comerciales del legacy. Mientras la API no publique
            este catálogo, se sostiene con overlay local operativo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="bg-transparent" onClick={() => reset()}>
            <RefreshCcw className="mr-2 h-4 w-4" /> Restablecer overlay
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Nueva marca
          </Button>
        </div>
      </div>

      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          El backend de ítems no expone un maestro de marcas. Esta pantalla cubre alta, edición y
          mantenimiento local sin inventar endpoints dedicados.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Marcas visibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{visibleBrands.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">Catastro inicial del lote 5</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">SKUs catalogados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCatalogo}</div>
            <p className="mt-1 text-xs text-muted-foreground">Cobertura visible por linea</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Marcas observadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{observadas}</div>
            <p className="mt-1 text-xs text-muted-foreground">Revision o descontinuadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Base actual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {categorias.length} categorias reales
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Catalogo de marcas</CardTitle>
            <CardDescription>
              Se usa como referencia operativa hasta que el backend exponga un maestro propio.
            </CardDescription>
            <div className="relative mt-2 max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar marca, familia o cobertura..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Marca</TableHead>
                  <TableHead>Familia</TableHead>
                  <TableHead>Catalogo</TableHead>
                  <TableHead>Cobertura</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleBrands.map((brand) => (
                  <TableRow
                    key={brand.id}
                    className={highlighted?.id === brand.id ? "bg-accent/40" : undefined}
                  >
                    <TableCell onClick={() => setSelectedId(brand.id)}>
                      <div className="font-medium">{brand.nombre}</div>
                      <div className="text-xs text-muted-foreground">{brand.origen}</div>
                    </TableCell>
                    <TableCell onClick={() => setSelectedId(brand.id)}>{brand.familia}</TableCell>
                    <TableCell onClick={() => setSelectedId(brand.id)}>{brand.catalogo}</TableCell>
                    <TableCell onClick={() => setSelectedId(brand.id)}>{brand.cobertura}</TableCell>
                    <TableCell onClick={() => setSelectedId(brand.id)}>
                      {getBrandBadge(brand.estado)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(brand)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(brand.id)}>
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
              <CardTitle>Marca destacada</CardTitle>
              <CardDescription>Lectura rapida del registro principal visible.</CardDescription>
            </CardHeader>
            <CardContent>
              {highlighted ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{highlighted.nombre}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{highlighted.familia}</p>
                    </div>
                    {getBrandBadge(highlighted.estado)}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">Lineas</p>
                      <p className="mt-2 font-medium">{highlighted.lineas.length}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">Catalogo</p>
                      <p className="mt-2 font-medium">{highlighted.catalogo} skus</p>
                    </div>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
                    {highlighted.observacion}
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
                <Trophy className="h-4 w-4" /> Lineas mas representativas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {visibleBrands.slice(0, 3).map((brand) => (
                <div key={brand.id} className="rounded-lg border p-4">
                  <p className="font-medium">{brand.nombre}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{brand.lineas.join(" · ")}</p>
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
              Las marcas siguen fuera del backend actual de ítems. El overlay local permite cubrir
              el maestro funcional del legacy y preparar la migración cuando exista API dedicada.
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar marca" : "Nueva marca"}</DialogTitle>
            <DialogDescription>
              Alta y edición local del maestro de marcas hasta contar con backend específico.
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
                <Label htmlFor="familia">Familia</Label>
                <Input
                  id="familia"
                  value={form.familia}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, familia: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="origen">Origen</Label>
                <Input
                  id="origen"
                  value={form.origen}
                  onChange={(event) => setForm((prev) => ({ ...prev, origen: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Select
                  value={form.estado}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      estado: value as LegacyInventoryBrand["estado"],
                    }))
                  }
                >
                  <SelectTrigger id="estado" className="w-full">
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activa">Activa</SelectItem>
                    <SelectItem value="revision">En revisión</SelectItem>
                    <SelectItem value="descontinuada">Descontinuada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="catalogo">SKUs catálogo</Label>
                <Input
                  id="catalogo"
                  value={form.catalogo}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, catalogo: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lineas">Líneas</Label>
              <Input
                id="lineas"
                value={form.lineas}
                onChange={(event) => setForm((prev) => ({ ...prev, lineas: event.target.value }))}
                placeholder="Taladros, Amoladoras"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cobertura">Cobertura</Label>
              <Input
                id="cobertura"
                value={form.cobertura}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, cobertura: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="observacion">Observación</Label>
              <Textarea
                id="observacion"
                rows={4}
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
            <Button onClick={handleSave}>Guardar marca</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
