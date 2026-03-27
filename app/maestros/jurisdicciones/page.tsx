"use client"

import { useMemo, useState } from "react"
import { PencilLine, Plus, RotateCcw, Search } from "lucide-react"

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
import { legacyJurisdictions, type LegacyJurisdiction } from "@/lib/legacy-masters-data"

type JurisdictionFormState = {
  id?: string
  codigo: string
  nombre: string
  provincia: string
  alicuota: string
  convenio: string
  riesgo: LegacyJurisdiction["riesgo"]
  estado: LegacyJurisdiction["estado"]
  observacion: string
}

const initialForm: JurisdictionFormState = {
  codigo: "",
  nombre: "",
  provincia: "",
  alicuota: "3.0",
  convenio: "Padron local",
  riesgo: "medio",
  estado: "activa",
  observacion: "",
}

function riskBadge(value: LegacyJurisdiction["riesgo"]) {
  if (value === "alto") return <Badge variant="destructive">Riesgo alto</Badge>
  if (value === "medio") return <Badge variant="secondary">Riesgo medio</Badge>
  return <Badge variant="outline">Riesgo bajo</Badge>
}

function stateBadge(value: LegacyJurisdiction["estado"]) {
  if (value === "activa") return <Badge>Activa</Badge>
  if (value === "revision") return <Badge variant="secondary">Revision</Badge>
  return <Badge variant="outline">Inactiva</Badge>
}

export default function JurisdiccionesPage() {
  const { rows, setRows, reset } = useLegacyLocalCollection<LegacyJurisdiction>(
    "legacy-jurisdicciones",
    legacyJurisdictions
  )
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"todas" | LegacyJurisdiction["estado"]>("todas")
  const [riskFilter, setRiskFilter] = useState<"todos" | LegacyJurisdiction["riesgo"]>("todos")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [form, setForm] = useState<JurisdictionFormState>(initialForm)

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rows.filter((row) => {
      const matchesSearch =
        !term ||
        row.codigo.toLowerCase().includes(term) ||
        row.nombre.toLowerCase().includes(term) ||
        row.provincia.toLowerCase().includes(term) ||
        row.convenio.toLowerCase().includes(term)

      const matchesStatus = statusFilter === "todas" || row.estado === statusFilter
      const matchesRisk = riskFilter === "todos" || row.riesgo === riskFilter

      return matchesSearch && matchesStatus && matchesRisk
    })
  }, [riskFilter, rows, search, statusFilter])

  const highlighted = filteredRows[0] ?? rows[0] ?? null
  const activeCount = rows.filter((row) => row.estado === "activa").length

  function openCreateDialog() {
    setForm(initialForm)
    setIsDialogOpen(true)
  }

  function openEditDialog(row: LegacyJurisdiction) {
    setForm({
      id: row.id,
      codigo: row.codigo,
      nombre: row.nombre,
      provincia: row.provincia,
      alicuota: row.alicuota.toString(),
      convenio: row.convenio,
      riesgo: row.riesgo,
      estado: row.estado,
      observacion: row.observacion,
    })
    setIsDialogOpen(true)
  }

  function saveRow() {
    const parsedRate = Number(form.alicuota)
    if (!form.codigo || !form.nombre || !form.provincia || Number.isNaN(parsedRate)) {
      return
    }

    const nextRow: LegacyJurisdiction = {
      id: form.id ?? globalThis.crypto.randomUUID(),
      codigo: form.codigo,
      nombre: form.nombre,
      provincia: form.provincia,
      alicuota: parsedRate,
      convenio: form.convenio,
      riesgo: form.riesgo,
      estado: form.estado,
      observacion: form.observacion,
    }

    setRows((current) => {
      if (!form.id) {
        return [nextRow, ...current]
      }

      return current.map((row) => (row.id === form.id ? nextRow : row))
    })
    setIsDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Jurisdicciones</h1>
        <p className="mt-1 text-muted-foreground">
          Maestro fiscal heredado del VB6. Se mantiene en almacenamiento local porque el backend
          actual todavia no expone contratos para jurisdicciones, padrones y convenios.
        </p>
      </div>

      <Alert>
        <AlertTitle>Cobertura local honesta</AlertTitle>
        <AlertDescription>
          Esta pantalla reemplaza la navegabilidad y edicion del maestro legacy, pero no inventa una
          API nueva. Los cambios se persisten en el navegador del entorno actual.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Jurisdicciones visibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredRows.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">En revision</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rows.filter((row) => row.estado === "revision").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Riesgo alto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rows.filter((row) => row.riesgo === "alto").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <CardTitle>Padron operativo</CardTitle>
                <CardDescription>
                  Busqueda, filtros y mantenimiento manual del maestro auxiliar.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={reset}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Restaurar base
                </Button>
                <Button onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" /> Nueva jurisdiccion
                </Button>
              </div>
            </div>
            <div className="grid gap-3 pt-2 md:grid-cols-[1.4fr_0.8fr_0.8fr]">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por codigo, nombre o provincia..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todos los estados</SelectItem>
                  <SelectItem value="activa">Activa</SelectItem>
                  <SelectItem value="revision">Revision</SelectItem>
                  <SelectItem value="inactiva">Inactiva</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={riskFilter}
                onValueChange={(value) => setRiskFilter(value as typeof riskFilter)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Riesgo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los riesgos</SelectItem>
                  <SelectItem value="alto">Alto</SelectItem>
                  <SelectItem value="medio">Medio</SelectItem>
                  <SelectItem value="bajo">Bajo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Codigo</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Provincia</TableHead>
                  <TableHead>Alicuota</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Riesgo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.codigo}</TableCell>
                    <TableCell>{row.nombre}</TableCell>
                    <TableCell>{row.provincia}</TableCell>
                    <TableCell>{row.alicuota}%</TableCell>
                    <TableCell>{stateBadge(row.estado)}</TableCell>
                    <TableCell>{riskBadge(row.riesgo)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(row)}>
                        <PencilLine className="mr-2 h-4 w-4" /> Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalle destacado</CardTitle>
            <CardDescription>
              Lectura rapida del registro principal segun filtros actuales.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {highlighted ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{highlighted.nombre}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{highlighted.codigo}</p>
                  </div>
                  {stateBadge(highlighted.estado)}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Provincia</p>
                    <p className="mt-2 font-medium">{highlighted.provincia}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Convenio</p>
                    <p className="mt-2 font-medium">{highlighted.convenio}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Alicuota</p>
                    <p className="mt-2 font-medium">{highlighted.alicuota}%</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Riesgo</p>
                    <div className="mt-2">{riskBadge(highlighted.riesgo)}</div>
                  </div>
                </div>
                <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                  {highlighted.observacion}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No hay registros visibles.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar jurisdiccion" : "Nueva jurisdiccion"}</DialogTitle>
            <DialogDescription>
              La persistencia es local hasta que exista un contrato backend para este maestro.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Codigo</label>
              <Input
                value={form.codigo}
                onChange={(event) =>
                  setForm((current) => ({ ...current, codigo: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre</label>
              <Input
                value={form.nombre}
                onChange={(event) =>
                  setForm((current) => ({ ...current, nombre: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Provincia</label>
              <Input
                value={form.provincia}
                onChange={(event) =>
                  setForm((current) => ({ ...current, provincia: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Alicuota</label>
              <Input
                value={form.alicuota}
                onChange={(event) =>
                  setForm((current) => ({ ...current, alicuota: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Convenio</label>
              <Input
                value={form.convenio}
                onChange={(event) =>
                  setForm((current) => ({ ...current, convenio: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <Select
                value={form.estado}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    estado: value as LegacyJurisdiction["estado"],
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activa">Activa</SelectItem>
                  <SelectItem value="revision">Revision</SelectItem>
                  <SelectItem value="inactiva">Inactiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Riesgo</label>
              <Select
                value={form.riesgo}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    riesgo: value as LegacyJurisdiction["riesgo"],
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alto">Alto</SelectItem>
                  <SelectItem value="medio">Medio</SelectItem>
                  <SelectItem value="bajo">Bajo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Observacion</label>
              <Textarea
                rows={4}
                value={form.observacion}
                onChange={(event) =>
                  setForm((current) => ({ ...current, observacion: event.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveRow}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
