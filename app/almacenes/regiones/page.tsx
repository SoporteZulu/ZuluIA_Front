"use client"

import { useMemo, useState } from "react"
import { AlertCircle, Pencil, Plus, RefreshCcw, Search, Trash2 } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { Textarea } from "@/components/ui/textarea"
import { useLegacyLocalCollection } from "@/lib/hooks/useLegacyLocalCollection"
import { useDepositos } from "@/lib/hooks/useDepositos"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"
import { legacyWarehouseRegions, type LegacyWarehouseRegion } from "@/lib/inventario-legacy-data"

const REGIONS_STORAGE_KEY = "wms-regions-local-overlay"

type RegionFormState = {
  nombre: string
  planta: string
  responsable: string
  zonas: string
  servicio: string
  nivelOcupacion: string
  observacion: string
}

function emptyForm(): RegionFormState {
  return {
    nombre: "",
    planta: "",
    responsable: "",
    zonas: "",
    servicio: "",
    nivelOcupacion: "",
    observacion: "",
  }
}

function formFromRegion(region: LegacyWarehouseRegion): RegionFormState {
  return {
    nombre: region.nombre,
    planta: region.planta,
    responsable: region.responsable,
    zonas: region.zonas.join(", "),
    servicio: region.servicio,
    nivelOcupacion: String(region.nivelOcupacion),
    observacion: region.observacion,
  }
}

function SummaryCard({
  title,
  value,
  description,
}: {
  title: string
  value: string
  description: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

export default function RegionesAlmacenPage() {
  const sucursalId = useDefaultSucursalId()
  const { depositos } = useDepositos(sucursalId)
  const { rows, setRows, reset } = useLegacyLocalCollection<LegacyWarehouseRegion>(
    REGIONS_STORAGE_KEY,
    legacyWarehouseRegions
  )

  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(rows[0]?.id ?? null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<RegionFormState>(emptyForm())
  const [formError, setFormError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()

    return rows.filter((row) => {
      if (!term) return true

      return [row.nombre, row.planta, row.responsable, row.servicio, row.observacion, ...row.zonas]
        .join(" ")
        .toLowerCase()
        .includes(term)
    })
  }, [rows, search])

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null
  const averageOccupation = Math.round(
    filtered.reduce((sum, row) => sum + row.nivelOcupacion, 0) / Math.max(filtered.length, 1)
  )

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setFormError(null)
    setDialogOpen(true)
  }

  const openEdit = (region: LegacyWarehouseRegion) => {
    setEditingId(region.id)
    setForm(formFromRegion(region))
    setFormError(null)
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!form.nombre.trim() || !form.planta.trim() || !form.responsable.trim()) {
      setFormError("Completá nombre, planta y responsable para guardar la región.")
      return
    }

    const nivelOcupacion = Number.parseInt(form.nivelOcupacion, 10)
    if (Number.isNaN(nivelOcupacion) || nivelOcupacion < 0 || nivelOcupacion > 100) {
      setFormError("La ocupación debe ser un porcentaje entre 0 y 100.")
      return
    }

    const next: LegacyWarehouseRegion = {
      id: editingId ?? `reg-local-${Date.now()}`,
      nombre: form.nombre.trim(),
      planta: form.planta.trim(),
      responsable: form.responsable.trim(),
      zonas: form.zonas
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      servicio: form.servicio.trim() || "Sin servicio definido",
      nivelOcupacion,
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
          <h1 className="text-3xl font-bold tracking-tight">Regiones</h1>
          <p className="mt-1 text-muted-foreground">
            Maestro regional del WMS con overlay local editable mientras no exista API de regiones
            físicas, responsables y agrupadores logísticos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="bg-transparent" onClick={() => reset()}>
            <RefreshCcw className="mr-2 h-4 w-4" /> Restablecer overlay
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Nueva región
          </Button>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          El backend actual no publica altas ni cambios de regiones WMS. Esta consola permite cubrir
          el ABM operativo en frontend con almacenamiento local, dejando explícito el límite del
          contrato.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Regiones visibles"
          value={String(filtered.length)}
          description="Regiones del overlay local para la sucursal actual."
        />
        <SummaryCard
          title="Zonas agrupadas"
          value={String(filtered.reduce((sum, row) => sum + row.zonas.length, 0))}
          description="Cantidad total de zonas referenciadas por región."
        />
        <SummaryCard
          title="Ocupación media"
          value={`${averageOccupation}%`}
          description="Promedio visible para la cobertura regional actual."
        />
        <SummaryCard
          title="Depósitos reales"
          value={String(depositos.length)}
          description="Referencia cruzada con depósitos expuestos por backend."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Mapa regional</CardTitle>
            <CardDescription>
              Estructura operativa usada por picking, recepciones y abastecimiento a producción.
            </CardDescription>
            <div className="relative mt-2 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por región, planta, zona o responsable..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Región</TableHead>
                  <TableHead>Planta</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead>Zonas</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow
                    key={row.id}
                    className={selected?.id === row.id ? "bg-accent/40" : undefined}
                  >
                    <TableCell className="font-medium" onClick={() => setSelectedId(row.id)}>
                      {row.nombre}
                    </TableCell>
                    <TableCell onClick={() => setSelectedId(row.id)}>{row.planta}</TableCell>
                    <TableCell onClick={() => setSelectedId(row.id)}>{row.responsable}</TableCell>
                    <TableCell onClick={() => setSelectedId(row.id)}>
                      {row.zonas.join(" · ")}
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
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No hay regiones que coincidan con la búsqueda actual.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{selected ? selected.nombre : "Región destacada"}</CardTitle>
            <CardDescription>
              {selected
                ? `${selected.planta} · ${selected.servicio}`
                : "Seleccioná una región para ver su legajo operativo."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selected ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Responsable</p>
                    <p className="mt-2 font-medium">{selected.responsable}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Ocupación</p>
                    <p className="mt-2 font-medium">{selected.nivelOcupacion}%</p>
                  </div>
                  <div className="rounded-lg border p-3 sm:col-span-2">
                    <p className="text-sm text-muted-foreground">Zonas</p>
                    <p className="mt-2 font-medium">{selected.zonas.join(" · ") || "Sin zonas"}</p>
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Observación</p>
                  <p className="mt-2 text-sm text-muted-foreground">{selected.observacion}</p>
                </div>
                <div className="rounded-lg bg-muted/30 p-4 text-sm">
                  <p className="font-medium">Gap backend</p>
                  <p className="mt-1 text-muted-foreground">
                    Región, responsable, servicio y asignación de zonas siguen modelados localmente.
                    Cuando exista API WMS, este overlay puede migrarse sin perder la estructura ya
                    relevada.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No hay región seleccionada.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar región" : "Nueva región"}</DialogTitle>
            <DialogDescription>
              Alta y edición local mientras el backend no publique ABM del mapa regional.
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
                <Label htmlFor="planta">Planta</Label>
                <Input
                  id="planta"
                  value={form.planta}
                  onChange={(event) => setForm((prev) => ({ ...prev, planta: event.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="responsable">Responsable</Label>
                <Input
                  id="responsable"
                  value={form.responsable}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, responsable: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ocupacion">Ocupación %</Label>
                <Input
                  id="ocupacion"
                  value={form.nivelOcupacion}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, nivelOcupacion: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="zonas">Zonas</Label>
              <Input
                id="zonas"
                value={form.zonas}
                onChange={(event) => setForm((prev) => ({ ...prev, zonas: event.target.value }))}
                placeholder="A1-PICK, A2-RES"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="servicio">Servicio</Label>
              <Input
                id="servicio"
                value={form.servicio}
                onChange={(event) => setForm((prev) => ({ ...prev, servicio: event.target.value }))}
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
            <Button onClick={handleSave}>Guardar región</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
