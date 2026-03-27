"use client"

import { useMemo, useState } from "react"
import { AlertCircle, Pencil, Plus, RefreshCcw, Search, Trash2 } from "lucide-react"

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
import { useLegacyLocalCollection } from "@/lib/hooks/useLegacyLocalCollection"
import { useDepositos } from "@/lib/hooks/useDepositos"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"
import { legacyWarehouseZones, type LegacyWarehouseZone } from "@/lib/inventario-legacy-data"

const ZONES_STORAGE_KEY = "wms-zones-local-overlay"

type ZoneFormState = {
  codigo: string
  deposito: string
  tipo: string
  temperatura: string
  capacidadPct: string
  criticidad: LegacyWarehouseZone["criticidad"]
  supervisor: string
  observacion: string
}

function emptyForm(): ZoneFormState {
  return {
    codigo: "",
    deposito: "",
    tipo: "",
    temperatura: "",
    capacidadPct: "",
    criticidad: "media",
    supervisor: "",
    observacion: "",
  }
}

function formFromZone(zone: LegacyWarehouseZone): ZoneFormState {
  return {
    codigo: zone.codigo,
    deposito: zone.deposito,
    tipo: zone.tipo,
    temperatura: zone.temperatura,
    capacidadPct: String(zone.capacidadPct),
    criticidad: zone.criticidad,
    supervisor: zone.supervisor,
    observacion: zone.observacion,
  }
}

function criticidadBadge(value: LegacyWarehouseZone["criticidad"]) {
  if (value === "alta") return <Badge variant="destructive">Alta</Badge>
  if (value === "media") return <Badge variant="secondary">Media</Badge>
  return <Badge variant="outline">Baja</Badge>
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

export default function ZonasAlmacenPage() {
  const sucursalId = useDefaultSucursalId()
  const { depositos } = useDepositos(sucursalId)
  const { rows, setRows, reset } = useLegacyLocalCollection<LegacyWarehouseZone>(
    ZONES_STORAGE_KEY,
    legacyWarehouseZones
  )

  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(rows[0]?.id ?? null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ZoneFormState>(emptyForm())
  const [formError, setFormError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()

    return rows.filter((row) => {
      if (!term) return true

      return [row.codigo, row.deposito, row.tipo, row.supervisor, row.observacion]
        .join(" ")
        .toLowerCase()
        .includes(term)
    })
  }, [rows, search])

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null
  const avgCapacity = Math.round(
    filtered.reduce((sum, row) => sum + row.capacidadPct, 0) / Math.max(filtered.length, 1)
  )

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setFormError(null)
    setDialogOpen(true)
  }

  const openEdit = (zone: LegacyWarehouseZone) => {
    setEditingId(zone.id)
    setForm(formFromZone(zone))
    setFormError(null)
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!form.codigo.trim() || !form.deposito.trim() || !form.tipo.trim()) {
      setFormError("Completá código, depósito y tipo para guardar la zona.")
      return
    }

    const capacidadPct = Number.parseInt(form.capacidadPct, 10)
    if (Number.isNaN(capacidadPct) || capacidadPct < 0 || capacidadPct > 100) {
      setFormError("La capacidad debe ser un porcentaje entre 0 y 100.")
      return
    }

    const next: LegacyWarehouseZone = {
      id: editingId ?? `zone-local-${Date.now()}`,
      codigo: form.codigo.trim(),
      deposito: form.deposito.trim(),
      tipo: form.tipo.trim(),
      temperatura: form.temperatura.trim() || "Ambiente",
      capacidadPct,
      criticidad: form.criticidad,
      supervisor: form.supervisor.trim() || "Sin supervisor",
      observacion: form.observacion.trim() || "Sin observación adicional.",
    }

    setRows((prev) => {
      const rest = prev.filter((row) => row.id !== next.id)
      return [...rest, next].sort((left, right) => left.codigo.localeCompare(right.codigo))
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
          <h1 className="text-3xl font-bold tracking-tight">Zonas</h1>
          <p className="mt-1 text-muted-foreground">
            Estructura interna del almacén con ABM local para tipos, criticidad, capacidad y
            supervisor mientras el backend no publique ubicaciones físicas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="bg-transparent" onClick={() => reset()}>
            <RefreshCcw className="mr-2 h-4 w-4" /> Restablecer overlay
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Nueva zona
          </Button>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Zona física, supervisor, temperatura y criticidad siguen fuera del backend actual. Esta
          consola mantiene el maestro operativo en frontend sin inventar endpoints.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Zonas visibles"
          value={String(filtered.length)}
          description="Zonas del overlay local aplicables al WMS actual."
        />
        <SummaryCard
          title="Depósitos cubiertos"
          value={String(new Set(filtered.map((row) => row.deposito)).size)}
          description="Agrupación física visible por depósito."
        />
        <SummaryCard
          title="Capacidad media"
          value={`${avgCapacity}%`}
          description="Uso operativo promedio sobre las zonas visibles."
        />
        <SummaryCard
          title="Depósitos reales"
          value={String(depositos.length)}
          description="Referencia cruzada con depósitos del backend."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Mapa de zonas</CardTitle>
            <CardDescription>
              Overlay local para cubrir picking, reserva, materia prima y acopio de obra.
            </CardDescription>
            <div className="relative mt-2 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por código, depósito, tipo o supervisor..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Depósito</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Capacidad</TableHead>
                  <TableHead>Criticidad</TableHead>
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
                      {row.codigo}
                    </TableCell>
                    <TableCell onClick={() => setSelectedId(row.id)}>{row.deposito}</TableCell>
                    <TableCell onClick={() => setSelectedId(row.id)}>{row.tipo}</TableCell>
                    <TableCell onClick={() => setSelectedId(row.id)}>{row.capacidadPct}%</TableCell>
                    <TableCell onClick={() => setSelectedId(row.id)}>
                      {criticidadBadge(row.criticidad)}
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
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No hay zonas para la búsqueda actual.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{selected ? selected.codigo : "Zona destacada"}</CardTitle>
            <CardDescription>
              {selected
                ? `${selected.deposito} · ${selected.tipo}`
                : "Seleccioná una zona para ver su legajo operativo."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selected ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{selected.codigo}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{selected.deposito}</p>
                  </div>
                  {criticidadBadge(selected.criticidad)}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Supervisor</p>
                    <p className="mt-2 font-medium">{selected.supervisor}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Temperatura</p>
                    <p className="mt-2 font-medium">{selected.temperatura}</p>
                  </div>
                </div>
                <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                  {selected.observacion}
                </div>
                <div className="rounded-lg bg-muted/30 p-4 text-sm">
                  <p className="font-medium">Gap backend</p>
                  <p className="mt-1 text-muted-foreground">
                    Capacidad, criticidad, supervisor y reglas físicas de zona siguen siendo datos
                    locales. El frontend ya puede sostener el maestro operativo hasta que exista el
                    contrato WMS definitivo.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No hay zona seleccionada.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar zona" : "Nueva zona"}</DialogTitle>
            <DialogDescription>
              Alta y edición local para sostener el maestro físico del WMS.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código</Label>
                <Input
                  id="codigo"
                  value={form.codigo}
                  onChange={(event) => setForm((prev) => ({ ...prev, codigo: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deposito">Depósito</Label>
                <Input
                  id="deposito"
                  value={form.deposito}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, deposito: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <Input
                  id="tipo"
                  value={form.tipo}
                  onChange={(event) => setForm((prev) => ({ ...prev, tipo: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="temperatura">Temperatura</Label>
                <Input
                  id="temperatura"
                  value={form.temperatura}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, temperatura: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="capacidad">Capacidad %</Label>
                <Input
                  id="capacidad"
                  value={form.capacidadPct}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, capacidadPct: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="criticidad">Criticidad</Label>
                <Select
                  value={form.criticidad}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      criticidad: value as LegacyWarehouseZone["criticidad"],
                    }))
                  }
                >
                  <SelectTrigger id="criticidad" className="w-full">
                    <SelectValue placeholder="Seleccionar criticidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baja">Baja</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="supervisor">Supervisor</Label>
                <Input
                  id="supervisor"
                  value={form.supervisor}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, supervisor: event.target.value }))
                  }
                />
              </div>
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
            <Button onClick={handleSave}>Guardar zona</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
