"use client"

import { useMemo, useState } from "react"
import { AlertCircle, ClipboardList, Pencil, Plus, Search, Sprout, Trash2 } from "lucide-react"

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useConteosStock } from "@/lib/hooks/useConteosStock"
import { useDepositos } from "@/lib/hooks/useDepositos"
import { useStockResumen } from "@/lib/hooks/useStock"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"
import { useZonas } from "@/lib/hooks/useZonas"
import type { ConteoCiclico, ConteoEstado } from "@/lib/types/almacenes-maestros"
import { toast } from "@/hooks/use-toast"

type CountFormState = {
  deposito: string
  zona: string
  frecuencia: string
  proximoConteo: string
  estado: ConteoEstado
  divergenciaPct: string
  responsable: string
  observacion: string
  nextStep: string
  executionNote: string
}

function emptyForm(): CountFormState {
  return {
    deposito: "",
    zona: "",
    frecuencia: "",
    proximoConteo: "",
    estado: "programado",
    divergenciaPct: "0",
    responsable: "",
    observacion: "",
    nextStep: "",
    executionNote: "",
  }
}

function formFromPlan(plan: ConteoCiclico): CountFormState {
  return {
    deposito: plan.deposito,
    zona: plan.zona,
    frecuencia: plan.frecuencia,
    proximoConteo: plan.proximoConteo,
    estado: plan.estado,
    divergenciaPct: String(plan.divergenciaPct),
    responsable: plan.responsable,
    observacion: plan.observacion,
    nextStep: plan.nextStep,
    executionNote: plan.executionNote,
  }
}

function statusBadge(status: ConteoEstado) {
  if (status === "en-ejecucion") return <Badge>En ejecución</Badge>
  if (status === "observado") return <Badge variant="destructive">Observado</Badge>
  return <Badge variant="secondary">Programado</Badge>
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

export default function ConteosAlmacenesPage() {
  const sucursalId = useDefaultSucursalId()
  const { bajoMinimo } = useStockResumen(sucursalId)
  const { depositos } = useDepositos(sucursalId)
  const { zonas } = useZonas("active")
  const { conteos, loading, saving, error, crear, actualizar, eliminar, seed } = useConteosStock()

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | ConteoEstado>("all")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<CountFormState>(emptyForm())
  const [formError, setFormError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()

    return conteos.filter((row) => {
      if (statusFilter !== "all" && row.estado !== statusFilter) {
        return false
      }

      if (!term) return true

      return [
        row.deposito,
        row.zona,
        row.frecuencia,
        row.responsable,
        row.observacion,
        row.nextStep,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    })
  }, [conteos, search, statusFilter])

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null
  const divergence = Math.round(
    filtered.reduce((sum, row) => sum + row.divergenciaPct, 0) / Math.max(filtered.length, 1)
  )

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setFormError(null)
    setDialogOpen(true)
  }

  const openEdit = (plan: ConteoCiclico) => {
    setEditingId(plan.id)
    setForm(formFromPlan(plan))
    setFormError(null)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.deposito.trim() || !form.zona.trim() || !form.frecuencia.trim()) {
      setFormError("Completá depósito, zona y frecuencia para guardar el conteo.")
      return
    }

    const divergenciaPct = Number.parseFloat(form.divergenciaPct.replace(",", "."))
    if (Number.isNaN(divergenciaPct) || divergenciaPct < 0) {
      setFormError("La divergencia debe ser un número válido mayor o igual a cero.")
      return
    }

    const payload = {
      ...form,
      divergenciaPct,
      deposito: form.deposito.trim(),
      zona: form.zona.trim(),
      frecuencia: form.frecuencia.trim(),
      responsable: form.responsable.trim(),
      observacion: form.observacion.trim(),
      nextStep: form.nextStep.trim(),
      executionNote: form.executionNote.trim(),
      proximoConteo: form.proximoConteo || new Date().toISOString().slice(0, 10),
    }

    const success = editingId ? await actualizar(editingId, payload) : await crear(payload)
    if (!success) return

    setDialogOpen(false)
    toast({
      title: editingId ? "Conteo actualizado" : "Conteo creado",
      description: "La agenda cíclica quedó persistida en backend.",
    })
  }

  const handleDelete = async (id: number) => {
    const success = await eliminar(id)
    if (!success) return

    toast({ title: "Conteo eliminado", description: "El plan fue removido de la agenda." })
  }

  const handleSeed = async () => {
    const result = await seed()
    if (!result) return

    toast({ title: "Base sembrada", description: result.mensaje })
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Conteos</h1>
          <p className="mt-1 text-muted-foreground">
            Agenda real de conteos cíclicos con seguimiento operativo, responsables y divergencias
            persistidas en backend.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="bg-transparent"
            onClick={handleSeed}
            disabled={saving}
          >
            <Sprout className="mr-2 h-4 w-4" /> Sembrar base legacy
          </Button>
          <Button onClick={openCreate} disabled={saving}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo conteo
          </Button>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          La planificación, edición y seguimiento básico de conteos ya corren sobre API real. La
          conciliación item por item y el ajuste automático siguen dependiendo de circuitos de stock
          posteriores.
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
          title="Planes visibles"
          value={loading ? "..." : String(filtered.length)}
          description="Conteos cíclicos activos en la agenda real actual."
        />
        <SummaryCard
          title="Observados"
          value={
            loading ? "..." : String(filtered.filter((row) => row.estado === "observado").length)
          }
          description="Conteos con divergencia o conciliación pendiente."
        />
        <SummaryCard
          title="Divergencia media"
          value={loading ? "..." : `${divergence}%`}
          description="Promedio visible para el lote actual de planes."
        />
        <SummaryCard
          title="Alertas stock"
          value={String(bajoMinimo.length)}
          description="Referencia real para priorizar recuentos físicos."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4" /> Planificación de conteos
            </CardTitle>
            <CardDescription>
              Agenda visible para depósitos, zonas y divergencias del circuito de auditoría.
            </CardDescription>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por depósito, zona, responsable o próximo paso..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as "all" | ConteoEstado)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="programado">Programado</SelectItem>
                  <SelectItem value="en-ejecucion">En ejecución</SelectItem>
                  <SelectItem value="observado">Observado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Depósito</TableHead>
                  <TableHead>Zona</TableHead>
                  <TableHead>Frecuencia</TableHead>
                  <TableHead>Próximo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Cargando agenda de conteos...
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => (
                    <TableRow
                      key={row.id}
                      className={selected?.id === row.id ? "bg-accent/40" : undefined}
                    >
                      <TableCell onClick={() => setSelectedId(row.id)}>{row.deposito}</TableCell>
                      <TableCell onClick={() => setSelectedId(row.id)}>{row.zona}</TableCell>
                      <TableCell onClick={() => setSelectedId(row.id)}>{row.frecuencia}</TableCell>
                      <TableCell onClick={() => setSelectedId(row.id)}>
                        {row.proximoConteo}
                      </TableCell>
                      <TableCell onClick={() => setSelectedId(row.id)}>
                        {statusBadge(row.estado)}
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
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No hay conteos que coincidan con los filtros actuales.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {selected ? `${selected.deposito} · ${selected.zona}` : "Conteo destacado"}
            </CardTitle>
            <CardDescription>
              {selected
                ? `${selected.frecuencia} · ${selected.proximoConteo}`
                : "Seleccioná un conteo para revisar el seguimiento."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selected ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{selected.responsable || "Sin responsable"}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{selected.frecuencia}</p>
                  </div>
                  {statusBadge(selected.estado)}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Divergencia</p>
                    <p className="mt-2 font-medium">{selected.divergenciaPct}%</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Próximo paso</p>
                    <p className="mt-2 font-medium">{selected.nextStep || "Sin siguiente paso"}</p>
                  </div>
                </div>
                <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Observación</p>
                  <p className="mt-2">{selected.observacion || "Sin observaciones registradas."}</p>
                </div>
                {selected.executionNote ? (
                  <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Nota de ejecución</p>
                    <p className="mt-2">{selected.executionNote}</p>
                  </div>
                ) : null}
                <div className="rounded-lg bg-muted/30 p-4 text-sm">
                  <p className="font-medium">Cobertura actual</p>
                  <p className="mt-1 text-muted-foreground">
                    Esta pantalla ya persiste agenda, responsables y estado. La auditoría detallada
                    contra stock sigue apoyándose en los circuitos de movimientos y ajustes.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No hay conteo seleccionado.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <WmsDialogContent size="lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar conteo" : "Nuevo conteo"}</DialogTitle>
            <DialogDescription>
              Agenda operativa persistida en backend para el circuito WMS de conteos cíclicos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="deposito">Depósito</Label>
                <Select
                  value={form.deposito || undefined}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, deposito: value }))}
                >
                  <SelectTrigger id="deposito" className="w-full">
                    <SelectValue placeholder="Seleccionar depósito" />
                  </SelectTrigger>
                  <SelectContent>
                    {depositos.map((deposito) => (
                      <SelectItem key={deposito.id} value={deposito.descripcion}>
                        {deposito.descripcion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="zona">Zona</Label>
                <Select
                  value={form.zona || undefined}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, zona: value }))}
                >
                  <SelectTrigger id="zona" className="w-full">
                    <SelectValue placeholder="Seleccionar zona" />
                  </SelectTrigger>
                  <SelectContent>
                    {zonas.map((zona) => (
                      <SelectItem key={zona.id} value={zona.descripcion}>
                        {zona.descripcion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="frecuencia">Frecuencia</Label>
                <Input
                  id="frecuencia"
                  value={form.frecuencia}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, frecuencia: event.target.value }))
                  }
                  placeholder="Semanal, quincenal, mensual..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proximo">Próximo conteo</Label>
                <Input
                  id="proximo"
                  type="date"
                  value={form.proximoConteo}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, proximoConteo: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Select
                  value={form.estado}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, estado: value as ConteoEstado }))
                  }
                >
                  <SelectTrigger id="estado" className="w-full">
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="programado">Programado</SelectItem>
                    <SelectItem value="en-ejecucion">En ejecución</SelectItem>
                    <SelectItem value="observado">Observado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="divergencia">Divergencia %</Label>
                <Input
                  id="divergencia"
                  value={form.divergenciaPct}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, divergenciaPct: event.target.value }))
                  }
                />
              </div>
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
            <div className="space-y-2">
              <Label htmlFor="next-step">Próximo paso</Label>
              <Textarea
                id="next-step"
                rows={3}
                value={form.nextStep}
                onChange={(event) => setForm((prev) => ({ ...prev, nextStep: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="execution-note">Nota de ejecución</Label>
              <Textarea
                id="execution-note"
                rows={3}
                value={form.executionNote}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, executionNote: event.target.value }))
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
              Guardar conteo
            </Button>
          </DialogFooter>
        </WmsDialogContent>
      </Dialog>
    </div>
  )
}
