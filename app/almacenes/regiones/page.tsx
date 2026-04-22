"use client"

import { useMemo, useState } from "react"
import { AlertCircle, Network, Pencil, Plus, Search, Trash2 } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { WmsDialogContent } from "@/components/almacenes/wms-responsive"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useDepositos } from "@/lib/hooks/useDepositos"
import { useRegiones } from "@/lib/hooks/useRegiones"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"
import type { RegionMaestro } from "@/lib/types/almacenes-maestros"
import { toast } from "@/hooks/use-toast"

type RegionFormState = {
  codigo: string
  descripcion: string
  regionIntegradoraId: string
  orden: string
  nivel: string
  codigoEstructura: string
  esRegionIntegradora: boolean
  observacion: string
}

function emptyForm(): RegionFormState {
  return {
    codigo: "",
    descripcion: "",
    regionIntegradoraId: "none",
    orden: "0",
    nivel: "0",
    codigoEstructura: "",
    esRegionIntegradora: false,
    observacion: "",
  }
}

function formFromRegion(region: RegionMaestro): RegionFormState {
  return {
    codigo: region.codigo,
    descripcion: region.descripcion,
    regionIntegradoraId: region.regionIntegradoraId ? String(region.regionIntegradoraId) : "none",
    orden: String(region.orden),
    nivel: String(region.nivel),
    codigoEstructura: region.codigoEstructura ?? "",
    esRegionIntegradora: region.esRegionIntegradora,
    observacion: region.observacion ?? "",
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

function regionBadge(region: RegionMaestro) {
  return region.esRegionIntegradora ? (
    <Badge>Integradora</Badge>
  ) : (
    <Badge variant="secondary">Operativa</Badge>
  )
}

export default function RegionesAlmacenPage() {
  const sucursalId = useDefaultSucursalId()
  const { depositos } = useDepositos(sucursalId)
  const { regiones, loading, saving, error, crear, actualizar, eliminar } = useRegiones()

  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<RegionFormState>(emptyForm())
  const [formError, setFormError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return regiones.filter((row) => {
      if (!term) return true
      return [row.codigo, row.descripcion, row.codigoEstructura ?? "", row.observacion ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(term)
    })
  }, [regiones, search])

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null
  const parentById = useMemo(
    () => new Map(regiones.map((region) => [region.id, region])),
    [regiones]
  )
  const childrenCount = useMemo(() => {
    const map = new Map<number, number>()
    regiones.forEach((region) => {
      if (!region.regionIntegradoraId) return
      map.set(region.regionIntegradoraId, (map.get(region.regionIntegradoraId) ?? 0) + 1)
    })
    return map
  }, [regiones])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setFormError(null)
    setDialogOpen(true)
  }

  const openEdit = (region: RegionMaestro) => {
    setEditingId(region.id)
    setForm(formFromRegion(region))
    setFormError(null)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.codigo.trim() && !editingId) {
      setFormError("Completá el código para crear la región.")
      return
    }

    if (!form.descripcion.trim()) {
      setFormError("Completá la descripción para guardar la región.")
      return
    }

    const orden = Number.parseInt(form.orden, 10)
    const nivel = Number.parseInt(form.nivel, 10)
    if (Number.isNaN(orden) || Number.isNaN(nivel)) {
      setFormError("Orden y nivel deben ser números enteros válidos.")
      return
    }

    const payload = {
      descripcion: form.descripcion.trim(),
      regionIntegradoraId:
        form.regionIntegradoraId !== "none" ? Number.parseInt(form.regionIntegradoraId, 10) : null,
      orden,
      nivel,
      codigoEstructura: form.codigoEstructura.trim() || null,
      esRegionIntegradora: form.esRegionIntegradora,
      observacion: form.observacion.trim() || null,
    }

    const success = editingId
      ? await actualizar(editingId, payload)
      : await crear({ codigo: form.codigo.trim().toUpperCase(), ...payload })

    if (!success) return

    setDialogOpen(false)
    toast({
      title: editingId ? "Región actualizada" : "Región creada",
      description: "La estructura regional quedó persistida en backend.",
    })
  }

  const handleDelete = async (id: number) => {
    const success = await eliminar(id)
    if (!success) return

    toast({ title: "Región eliminada", description: "La región fue removida del maestro." })
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Regiones</h1>
          <p className="mt-1 text-muted-foreground">
            Estructura jerárquica real de regiones con código, nivel, integradoras y subregiones.
          </p>
        </div>
        <Button onClick={openCreate} disabled={saving}>
          <Plus className="mr-2 h-4 w-4" /> Nueva región
        </Button>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          El mapa regional ahora corre sobre el ABM real del backend. La estructura soporta
          jerarquía, orden y regiones integradoras, reemplazando el overlay local previo.
        </AlertDescription>
      </Alert>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Regiones visibles"
          value={loading ? "..." : String(filtered.length)}
          description="Estructura regional activa en el maestro actual."
        />
        <SummaryCard
          title="Integradoras"
          value={loading ? "..." : String(regiones.filter((row) => row.esRegionIntegradora).length)}
          description="Nodos superiores para agrupar subregiones operativas."
        />
        <SummaryCard
          title="Subregiones"
          value={
            loading
              ? "..."
              : String(regiones.filter((row) => row.regionIntegradoraId !== null).length)
          }
          description="Regiones hijas ya vinculadas a una integradora."
        />
        <SummaryCard
          title="Depósitos reales"
          value={String(depositos.length)}
          description="Referencia cruzada del circuito logístico disponible."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Network className="h-4 w-4" /> Mapa regional
            </CardTitle>
            <CardDescription>
              Estructura operativa usada por logística, abastecimiento y agrupadores territoriales.
            </CardDescription>
            <div className="relative mt-2 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por código, descripción u observación..."
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
                  <TableHead>Descripción</TableHead>
                  <TableHead>Nivel</TableHead>
                  <TableHead>Padre</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      Cargando regiones...
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => (
                    <TableRow
                      key={row.id}
                      className={selected?.id === row.id ? "bg-accent/40" : undefined}
                    >
                      <TableCell className="font-medium" onClick={() => setSelectedId(row.id)}>
                        {row.codigo}
                      </TableCell>
                      <TableCell onClick={() => setSelectedId(row.id)}>{row.descripcion}</TableCell>
                      <TableCell onClick={() => setSelectedId(row.id)}>{row.nivel}</TableCell>
                      <TableCell onClick={() => setSelectedId(row.id)}>
                        {row.regionIntegradoraId
                          ? (parentById.get(row.regionIntegradoraId)?.descripcion ?? "-")
                          : "Raíz"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(row)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => void handleDelete(row.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {!loading && filtered.length === 0 ? (
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
            <CardTitle>{selected ? selected.descripcion : "Región destacada"}</CardTitle>
            <CardDescription>
              {selected
                ? `${selected.codigo} · nivel ${selected.nivel}`
                : "Seleccioná una región para ver su legajo operativo."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selected ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{selected.codigo}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selected.codigoEstructura || "Sin código estructural"}
                    </p>
                  </div>
                  {regionBadge(selected)}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Región padre</p>
                    <p className="mt-2 font-medium">
                      {selected.regionIntegradoraId
                        ? (parentById.get(selected.regionIntegradoraId)?.descripcion ??
                          "No encontrada")
                        : "Sin padre"}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Subregiones directas</p>
                    <p className="mt-2 font-medium">{childrenCount.get(selected.id) ?? 0}</p>
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Observación</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {selected.observacion || "Sin observaciones registradas."}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/30 p-4 text-sm">
                  <p className="font-medium">Cobertura actual</p>
                  <p className="mt-1 text-muted-foreground">
                    La estructura regional ya se administra desde backend con jerarquía completa.
                    Los vínculos físicos WMS específicos pueden enriquecer este maestro sin volver a
                    un overlay local.
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
        <WmsDialogContent size="lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar región" : "Nueva región"}</DialogTitle>
            <DialogDescription>
              Alta y edición sobre el maestro jerárquico publicado por backend.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código</Label>
                <Input
                  id="codigo"
                  value={form.codigo}
                  disabled={editingId !== null}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, codigo: event.target.value.toUpperCase() }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Input
                  id="descripcion"
                  value={form.descripcion}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, descripcion: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="padre">Región padre</Label>
                <Select
                  value={form.regionIntegradoraId}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, regionIntegradoraId: value }))
                  }
                >
                  <SelectTrigger id="padre" className="w-full">
                    <SelectValue placeholder="Seleccionar región padre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin padre</SelectItem>
                    {regiones
                      .filter((region) => region.id !== editingId)
                      .map((region) => (
                        <SelectItem key={region.id} value={String(region.id)}>
                          {region.codigo} · {region.descripcion}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="estructura">Código estructura</Label>
                <Input
                  id="estructura"
                  value={form.codigoEstructura}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      codigoEstructura: event.target.value.toUpperCase(),
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="orden">Orden</Label>
                <Input
                  id="orden"
                  value={form.orden}
                  onChange={(event) => setForm((prev) => ({ ...prev, orden: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nivel">Nivel</Label>
                <Input
                  id="nivel"
                  value={form.nivel}
                  onChange={(event) => setForm((prev) => ({ ...prev, nivel: event.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Región integradora</p>
                <p className="text-xs text-muted-foreground">
                  Marca el nodo como agrupador superior dentro de la jerarquía.
                </p>
              </div>
              <Switch
                checked={form.esRegionIntegradora}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, esRegionIntegradora: checked }))
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
            <Button onClick={() => void handleSave()} disabled={saving}>
              Guardar región
            </Button>
          </DialogFooter>
        </WmsDialogContent>
      </Dialog>
    </div>
  )
}
