"use client"

import { useMemo, useState } from "react"
import { AlertCircle, ClipboardList, Pencil, Plus, RefreshCcw, Search, Trash2 } from "lucide-react"

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
import { useStockResumen } from "@/lib/hooks/useStock"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"
import {
  legacyWarehouseCountPlans,
  type LegacyWarehouseCountPlan,
} from "@/lib/inventario-legacy-data"

const COUNT_STORAGE_KEY = "wms-count-plans-local-overlay"

type LocalCountPlan = LegacyWarehouseCountPlan & {
  nextStep: string
  executionNote: string
}

type CountFormState = {
  deposito: string
  zona: string
  frecuencia: string
  proximoConteo: string
  estado: LegacyWarehouseCountPlan["estado"]
  divergenciaPct: string
  responsable: string
  observacion: string
  nextStep: string
  executionNote: string
}

function seedCountPlans(): LocalCountPlan[] {
  return legacyWarehouseCountPlans.map((row) => ({
    ...row,
    nextStep:
      row.estado === "observado"
        ? "Conciliar diferencias y definir ajuste manual o re-conteo."
        : "Preparar equipo y validar cobertura antes del próximo conteo.",
    executionNote: "",
  }))
}

function emptyForm(): CountFormState {
  return {
    deposito: "",
    zona: "",
    frecuencia: "",
    proximoConteo: "",
    estado: "programado",
    divergenciaPct: "",
    responsable: "",
    observacion: "",
    nextStep: "",
    executionNote: "",
  }
}

function formFromPlan(plan: LocalCountPlan): CountFormState {
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

function statusBadge(status: LegacyWarehouseCountPlan["estado"]) {
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
  const { rows, setRows, reset } = useLegacyLocalCollection<LocalCountPlan>(
    COUNT_STORAGE_KEY,
    seedCountPlans()
  )

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | LegacyWarehouseCountPlan["estado"]>(
    "all"
  )
  const [selectedId, setSelectedId] = useState<string | null>(rows[0]?.id ?? null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CountFormState>(emptyForm())
  const [formError, setFormError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()

    return rows.filter((row) => {
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
  }, [rows, search, statusFilter])

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

  const openEdit = (plan: LocalCountPlan) => {
    setEditingId(plan.id)
    setForm(formFromPlan(plan))
    setFormError(null)
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!form.deposito.trim() || !form.zona.trim() || !form.frecuencia.trim()) {
      setFormError("Completá depósito, zona y frecuencia para guardar el conteo.")
      return
    }

    const divergenciaPct = Number.parseFloat(form.divergenciaPct.replace(",", "."))
    if (Number.isNaN(divergenciaPct) || divergenciaPct < 0) {
      setFormError("La divergencia debe ser un número válido mayor o igual a cero.")
      return
    }

    const next: LocalCountPlan = {
      id: editingId ?? `count-local-${Date.now()}`,
      deposito: form.deposito.trim(),
      zona: form.zona.trim(),
      frecuencia: form.frecuencia.trim(),
      proximoConteo: form.proximoConteo || new Date().toISOString().slice(0, 10),
      estado: form.estado,
      divergenciaPct,
      responsable: form.responsable.trim() || "Sin responsable",
      observacion: form.observacion.trim() || "Sin observación adicional.",
      nextStep: form.nextStep.trim() || "Sin próximo paso definido.",
      executionNote: form.executionNote.trim(),
    }

    setRows((prev) => {
      const rest = prev.filter((row) => row.id !== next.id)
      return [...rest, next].sort((left, right) =>
        left.proximoConteo.localeCompare(right.proximoConteo)
      )
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
          <h1 className="text-3xl font-bold tracking-tight">Conteos</h1>
          <p className="mt-1 text-muted-foreground">
            Agenda local de conteos cíclicos con divergencias, responsables y próximos pasos hasta
            que exista una agenda backend de auditoría física.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="bg-transparent" onClick={() => reset()}>
            <RefreshCcw className="mr-2 h-4 w-4" /> Restablecer overlay
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo conteo
          </Button>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          El backend no publica agenda, ejecución ni conciliación de conteos. Esta pantalla cubre la
          planificación y seguimiento local del circuito legacy sin inventar operaciones servidor.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Planes visibles"
          value={String(filtered.length)}
          description="Conteos cíclicos dentro del overlay local actual."
        />
        <SummaryCard
          title="Observados"
          value={String(filtered.filter((row) => row.estado === "observado").length)}
          description="Conteos con divergencia o conciliación pendiente."
        />
        <SummaryCard
          title="Divergencia media"
          value={`${divergence}%`}
          description="Promedio visible para el lote actual de planes."
        />
        <SummaryCard
          title="Alertas stock"
          value={String(bajoMinimo.length)}
          description="Referencia real del backend para priorizar conteos."
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
                onValueChange={(value) =>
                  setStatusFilter(value as "all" | LegacyWarehouseCountPlan["estado"])
                }
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
                {filtered.map((row) => (
                  <TableRow
                    key={row.id}
                    className={selected?.id === row.id ? "bg-accent/40" : undefined}
                  >
                    <TableCell onClick={() => setSelectedId(row.id)}>{row.deposito}</TableCell>
                    <TableCell onClick={() => setSelectedId(row.id)}>{row.zona}</TableCell>
                    <TableCell onClick={() => setSelectedId(row.id)}>{row.frecuencia}</TableCell>
                    <TableCell onClick={() => setSelectedId(row.id)}>{row.proximoConteo}</TableCell>
                    <TableCell onClick={() => setSelectedId(row.id)}>
                      {statusBadge(row.estado)}
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
                    <p className="font-semibold">{selected.responsable}</p>
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
                    <p className="mt-2 font-medium">{selected.nextStep}</p>
                  </div>
                </div>
                <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Observación</p>
                  <p className="mt-2">{selected.observacion}</p>
                </div>
                {selected.executionNote ? (
                  <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Nota de ejecución</p>
                    <p className="mt-2">{selected.executionNote}</p>
                  </div>
                ) : null}
                <div className="rounded-lg bg-muted/30 p-4 text-sm">
                  <p className="font-medium">Gap backend</p>
                  <p className="mt-1 text-muted-foreground">
                    La ejecución del conteo, la conciliación contra stock y el ajuste resultante
                    siguen pendientes de backend. El frontend ya cubre la planificación y el
                    seguimiento del circuito del legacy.
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar conteo" : "Nuevo conteo"}</DialogTitle>
            <DialogDescription>
              Agenda local de conteos para mantener el circuito WMS mientras no exista backend.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
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
              <div className="space-y-2">
                <Label htmlFor="zona">Zona</Label>
                <Input
                  id="zona"
                  value={form.zona}
                  onChange={(event) => setForm((prev) => ({ ...prev, zona: event.target.value }))}
                />
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
                    setForm((prev) => ({
                      ...prev,
                      estado: value as LegacyWarehouseCountPlan["estado"],
                    }))
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
            <Button onClick={handleSave}>Guardar conteo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
