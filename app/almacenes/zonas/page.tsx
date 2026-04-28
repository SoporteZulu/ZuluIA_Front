"use client"

import { useMemo, useState } from "react"
import { AlertCircle, Pencil, Plus, Search, ShieldCheck, ShieldOff } from "lucide-react"

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useDepositos } from "@/lib/hooks/useDepositos"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"
import { useZonas } from "@/lib/hooks/useZonas"
import type { ZonaMaestro } from "@/lib/types/almacenes-maestros"
import { toast } from "@/hooks/use-toast"

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

function zoneBadge(activo: boolean) {
  return activo ? <Badge>Activa</Badge> : <Badge variant="secondary">Inactiva</Badge>
}

export default function ZonasAlmacenPage() {
  const sucursalId = useDefaultSucursalId()
  const { depositos } = useDepositos(sucursalId)
  const { zonas, loading, saving, error, crear, actualizar, cambiarEstado } = useZonas("all")

  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [descripcion, setDescripcion] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return zonas.filter((row) => {
      if (!term) return true
      return row.descripcion.toLowerCase().includes(term)
    })
  }, [search, zonas])

  const visibleStats = useMemo(
    () => ({
      total: filtered.length,
      activas: filtered.filter((row) => row.activo).length,
      inactivas: filtered.filter((row) => !row.activo).length,
    }),
    [filtered]
  )

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null

  const openCreate = () => {
    setEditingId(null)
    setDescripcion("")
    setFormError(null)
    setDialogOpen(true)
  }

  const openEdit = (zona: ZonaMaestro) => {
    setEditingId(zona.id)
    setDescripcion(zona.descripcion)
    setFormError(null)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!descripcion.trim()) {
      setFormError("Completá la descripción para guardar la zona.")
      return
    }

    const success = editingId
      ? await actualizar(editingId, { descripcion: descripcion.trim() })
      : await crear({ descripcion: descripcion.trim() })

    if (!success) return

    setDialogOpen(false)
    toast({
      title: editingId ? "Zona actualizada" : "Zona creada",
      description: "El maestro quedó persistido en backend.",
    })
  }

  const handleToggle = async (zona: ZonaMaestro) => {
    const success = await cambiarEstado(zona.id, !zona.activo)
    if (!success) return

    toast({
      title: zona.activo ? "Zona desactivada" : "Zona activada",
      description: `${zona.descripcion} fue ${zona.activo ? "desactivada" : "reactivada"}.`,
    })
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Zonas</h1>
          <p className="mt-1 text-muted-foreground">
            Maestro real de zonas publicado por backend, con alta, edición y activación operativa.
          </p>
        </div>
        <Button onClick={openCreate} disabled={saving}>
          <Plus className="mr-2 h-4 w-4" /> Nueva zona
        </Button>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          El overlay local fue reemplazado por el ABM real de zonas. La semántica publicada hoy es
          de maestro simple por descripción y estado, sin atributos físicos extendidos.
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
          title="Zonas visibles"
          value={loading ? "..." : String(visibleStats.total)}
          description="Maestro disponible con datos reales del backend."
        />
        <SummaryCard
          title="Activas"
          value={loading ? "..." : String(visibleStats.activas)}
          description="Zonas visibles habilitadas para operación actual."
        />
        <SummaryCard
          title="Inactivas"
          value={loading ? "..." : String(visibleStats.inactivas)}
          description="Zonas visibles dadas de baja lógica, aún visibles para auditoría."
        />
        <SummaryCard
          title="Depósitos reales"
          value={String(depositos.length)}
          description="Cobertura operativa disponible para el circuito almacenes."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Maestro de zonas</CardTitle>
            <CardDescription>
              Alta y mantenimiento del nomenclador operativo disponible hoy en backend.
            </CardDescription>
            <div className="relative mt-2 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por descripción..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                      Cargando zonas...
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => (
                    <TableRow
                      key={row.id}
                      className={selected?.id === row.id ? "bg-accent/40" : undefined}
                    >
                      <TableCell className="font-medium" onClick={() => setSelectedId(row.id)}>
                        {row.descripcion}
                      </TableCell>
                      <TableCell onClick={() => setSelectedId(row.id)}>
                        {zoneBadge(row.activo)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(row)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => void handleToggle(row)}
                          >
                            {row.activo ? (
                              <ShieldOff className="h-4 w-4" />
                            ) : (
                              <ShieldCheck className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {!loading && filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
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
            <CardTitle>{selected ? selected.descripcion : "Zona destacada"}</CardTitle>
            <CardDescription>
              {selected
                ? `Identificador ${selected.id}`
                : "Seleccioná una zona para ver su legajo operativo."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selected ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{selected.descripcion}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Registro backend #{selected.id}
                    </p>
                  </div>
                  {zoneBadge(selected.activo)}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Depósitos operativos</p>
                    <p className="mt-2 font-medium">{depositos.length}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Estado</p>
                    <p className="mt-2 font-medium">
                      {selected.activo ? "Habilitada" : "Inactiva"}
                    </p>
                  </div>
                </div>
                <div className="rounded-lg bg-muted/30 p-4 text-sm">
                  <p className="font-medium">Cobertura actual</p>
                  <p className="mt-1 text-muted-foreground">
                    El backend hoy publica nombre y vigencia de la zona. Los metadatos físicos
                    extendidos deberán incorporarse cuando exista un contrato WMS específico.
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
        <WmsDialogContent size="md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar zona" : "Nueva zona"}</DialogTitle>
            <DialogDescription>
              Alta y edición sobre el maestro real expuesto por backend.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Input
                id="descripcion"
                value={descripcion}
                onChange={(event) => setDescripcion(event.target.value)}
                placeholder="Zona norte, picking, crossdock..."
              />
            </div>
            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              Guardar zona
            </Button>
          </DialogFooter>
        </WmsDialogContent>
      </Dialog>
    </div>
  )
}
