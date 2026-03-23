"use client"

import { useMemo, useState } from "react"
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
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useCentrosCosto } from "@/lib/hooks/useCentrosCosto"
import type { CentroCosto } from "@/lib/types/centros-costo"
import {
  AlertCircle,
  ArrowRightLeft,
  GitBranch,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  ShieldAlert,
  Waypoints,
} from "lucide-react"

type DraftState = {
  id?: number
  codigo: string
  descripcion: string
  activo: boolean
  padre: string
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

function DetailFieldGrid({ fields }: { fields: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map((field) => (
        <div key={field.label} className="rounded-lg border p-3">
          <p className="text-sm text-muted-foreground">{field.label}</p>
          <p className="mt-2 font-medium wrap-break-word">{field.value}</p>
        </div>
      ))}
    </div>
  )
}

function emptyDraft(): DraftState {
  return {
    codigo: "",
    descripcion: "",
    activo: true,
    padre: "none",
  }
}

function getIndentLevel(centro: CentroCosto, parentById: Map<number, CentroCosto>) {
  let level = 0
  let currentParent = centro.padre

  while (currentParent) {
    const parent = parentById.get(currentParent)
    if (!parent) break
    level += 1
    currentParent = parent.padre
    if (level > 6) break
  }

  return level
}

function getIndentClass(level: number) {
  if (level === 0) return "font-medium"
  if (level === 1) return "pl-4"
  if (level === 2) return "pl-8"
  return "pl-12"
}

function getCentroPath(centro: CentroCosto, parentById: Map<number, CentroCosto>) {
  const segments = [centro.descripcion]
  let currentParent = centro.padre
  let guard = 0

  while (currentParent && guard < 8) {
    const parent = parentById.get(currentParent)
    if (!parent) break
    segments.unshift(parent.descripcion)
    currentParent = parent.padre
    guard += 1
  }

  return segments.join(" / ")
}

function getCentroStatus(centro: CentroCosto, childrenCount: Map<number, number>) {
  if (!centro.activo) {
    return {
      label: "Inactivo",
      tone: "secondary" as const,
      detail:
        "Se conserva para trazabilidad histórica pero no debería recibir nuevas imputaciones.",
    }
  }

  if ((childrenCount.get(centro.id) ?? 0) > 0) {
    return {
      label: "Nodo estructural",
      tone: "default" as const,
      detail: "Organiza ramas dependientes dentro del árbol de centros de costo.",
    }
  }

  return {
    label: "Nodo terminal",
    tone: "outline" as const,
    detail: "No tiene dependencias visibles y queda listo para imputación o clasificación final.",
  }
}

function getCentroCircuit(centro: CentroCosto, parentById: Map<number, CentroCosto>) {
  if (!centro.padre) {
    return {
      label: "Cabecera del árbol",
      detail: "Opera como raíz de una familia de centros o como nodo superior de clasificación.",
    }
  }

  const parent = parentById.get(centro.padre)

  if (parent?.padre) {
    return {
      label: "Rama operativa",
      detail: "Forma parte de una jerarquía intermedia con dependencia visible dentro del árbol.",
    }
  }

  return {
    label: "Dependencia directa",
    detail: "Cuelga de una raíz visible y ordena la segunda capa del circuito contable.",
  }
}

function getLegacyCoverage(centro: CentroCosto) {
  const available = [
    centro.codigo ? 1 : 0,
    centro.descripcion ? 1 : 0,
    centro.padre ? 1 : 0,
  ].reduce((sum, value) => sum + value, 0)

  if (available >= 3) {
    return {
      label: "Cobertura amplia",
      detail:
        "El centro expone código, descripción y relación jerárquica dentro del contrato actual.",
    }
  }

  return {
    label: "Cobertura base",
    detail:
      "La API actual cubre el maestro esencial y no expone métricas o responsables históricos del legado.",
  }
}

export default function CentrosCostoPage() {
  const [soloActivos, setSoloActivos] = useState(false)
  const { centrosCosto, loading, error, crear, actualizar, refetch } = useCentrosCosto(soloActivos)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create")
  const [draft, setDraft] = useState<DraftState>(emptyDraft)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const parentById = useMemo(
    () => new Map(centrosCosto.map((centro) => [centro.id, centro])),
    [centrosCosto]
  )

  const childrenCount = useMemo(() => {
    const result = new Map<number, number>()

    for (const centro of centrosCosto) {
      if (!centro.padre) continue
      result.set(centro.padre, (result.get(centro.padre) ?? 0) + 1)
    }

    return result
  }, [centrosCosto])

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return [...centrosCosto]
      .filter((centro) => {
        const matchesTerm =
          !term ||
          centro.codigo.toLowerCase().includes(term) ||
          centro.descripcion.toLowerCase().includes(term)
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "activos" && centro.activo) ||
          (statusFilter === "inactivos" && !centro.activo)

        return matchesTerm && matchesStatus
      })
      .sort((a, b) => a.codigo.localeCompare(b.codigo))
  }, [centrosCosto, searchTerm, statusFilter])

  const selectedCentro = useMemo(
    () => filtered.find((centro) => centro.id === selectedId) ?? null,
    [filtered, selectedId]
  )

  const activeSelectedCentro = selectedCentro ?? filtered[0] ?? null

  const activos = centrosCosto.filter((centro) => centro.activo).length
  const inactivos = centrosCosto.length - activos
  const roots = centrosCosto.filter((centro) => !centro.padre).length
  const leaves = centrosCosto.filter((centro) => (childrenCount.get(centro.id) ?? 0) === 0).length
  const maxDepth = centrosCosto.reduce(
    (max, centro) => Math.max(max, getIndentLevel(centro, parentById)),
    0
  )
  const orphanCount = centrosCosto.filter(
    (centro) => centro.padre && !parentById.has(centro.padre)
  ).length
  const selectedCentroStatus = activeSelectedCentro
    ? getCentroStatus(activeSelectedCentro, childrenCount)
    : null
  const selectedCentroCircuit = activeSelectedCentro
    ? getCentroCircuit(activeSelectedCentro, parentById)
    : null
  const selectedCentroCoverage = activeSelectedCentro
    ? getLegacyCoverage(activeSelectedCentro)
    : null

  const openCreate = () => {
    setDialogMode("create")
    setDraft(emptyDraft())
    setSubmitError(null)
    setDialogOpen(true)
  }

  const openEdit = (centro: CentroCosto) => {
    setDialogMode("edit")
    setDraft({
      id: centro.id,
      codigo: centro.codigo,
      descripcion: centro.descripcion,
      activo: centro.activo,
      padre: centro.padre ? String(centro.padre) : "none",
    })
    setSubmitError(null)
    setDialogOpen(true)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
  }

  const handleSubmit = async () => {
    setSubmitError(null)

    const codigo = draft.codigo.trim()
    const descripcion = draft.descripcion.trim()

    if (!codigo || !descripcion) {
      setSubmitError("Completá código y descripción para guardar el centro de costo.")
      return
    }

    if (draft.id && draft.padre !== "none" && Number(draft.padre) === draft.id) {
      setSubmitError("Un centro de costo no puede quedar relacionado consigo mismo como padre.")
      return
    }

    setSaving(true)
    const payload = {
      codigo,
      descripcion,
      activo: draft.activo,
      padre: draft.padre === "none" ? undefined : Number(draft.padre),
    }

    const ok = dialogMode === "create" ? await crear(payload) : await actualizar(draft.id!, payload)

    setSaving(false)

    if (!ok) {
      setSubmitError(
        dialogMode === "create"
          ? "No se pudo crear el centro de costo en backend."
          : "No se pudo actualizar el centro de costo seleccionado."
      )
      return
    }

    setDialogOpen(false)
    setDraft(emptyDraft())
  }

  const errorMessage = submitError || error

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Centros de costo</h1>
          <p className="text-muted-foreground">
            Consola operativa para mantener la estructura jerárquica, activar o desactivar centros y
            ordenar dependencias contables sin recurrir a vistas estáticas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={refetch} disabled={loading}>
            <RefreshCcw className="h-4 w-4" />
            Actualizar
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nuevo centro
          </Button>
        </div>
      </div>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total registrados"
          value={String(centrosCosto.length)}
          description="Centros recuperados según el filtro operativo actual."
        />
        <SummaryCard
          title="Activos"
          value={String(activos)}
          description="Disponibles para imputación o clasificación interna."
        />
        <SummaryCard
          title="Inactivos"
          value={String(inactivos)}
          description="Se mantienen visibles para trazabilidad histórica."
        />
        <SummaryCard
          title="Raíces del árbol"
          value={String(roots)}
          description="Centros sin padre, útiles para organizar el mapa jerárquico."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          title="Nodos terminales"
          value={String(leaves)}
          description="Centros sin dependencias visibles dentro de la consulta actual."
        />
        <SummaryCard
          title="Profundidad máxima"
          value={String(maxDepth + 1)}
          description="Cantidad de niveles visibles detectados en la jerarquía actual."
        />
        <SummaryCard
          title="Vínculos a revisar"
          value={String(orphanCount)}
          description="Centros cuyo padre no aparece en el lote recuperado por backend."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros operativos</CardTitle>
          <CardDescription>
            Combiná búsqueda, estado y visibilidad de inactivos para revisar el árbol real de
            centros de costo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_220px_auto]">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="activos">Solo activos</SelectItem>
                <SelectItem value="inactivos">Solo inactivos</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={clearFilters}>
              Limpiar
            </Button>
          </div>

          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Switch
              id="show-inactive"
              checked={!soloActivos}
              onCheckedChange={(checked) => setSoloActivos(!checked)}
            />
            <Label htmlFor="show-inactive">Mostrar centros inactivos en la consulta</Label>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-lg border p-3 text-sm">
              <p className="text-muted-foreground">Lectura del árbol</p>
              <p className="mt-1 font-medium">
                {filtered.length} centro(s) visibles tras búsqueda y {roots} raíz(ces) cargadas
              </p>
              <p className="mt-2 text-muted-foreground">
                La profundidad se calcula sobre la jerarquía publicada hoy por la API.
              </p>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <p className="text-muted-foreground">Cobertura del maestro</p>
              <p className="mt-1 font-medium">
                Código, descripción, estado y padre visibles en todos los nodos activos del contrato
              </p>
              <p className="mt-2 text-muted-foreground">
                No se infieren responsables, presupuestos ni métricas históricas fuera del backend.
              </p>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <p className="text-muted-foreground">Gap legacy identificado</p>
              <p className="mt-1 font-medium">
                Responsables, presupuestos y analíticas extendidas siguen fuera del contrato actual
              </p>
              <p className="mt-2 text-muted-foreground">
                La vista documenta el faltante y refuerza la lectura operativa del árbol existente.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {activeSelectedCentro && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ArrowRightLeft className="h-5 w-5" />
              Centro destacado: {activeSelectedCentro.descripcion}
            </CardTitle>
            <CardDescription>
              Resumen operativo del nodo seleccionado antes de abrir su edición directa.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <div className="space-y-4">
              <DetailFieldGrid
                fields={[
                  { label: "Código", value: activeSelectedCentro.codigo },
                  {
                    label: "Centro padre",
                    value: activeSelectedCentro.padre
                      ? `${parentById.get(activeSelectedCentro.padre)?.codigo ?? `#${activeSelectedCentro.padre}`} · ${parentById.get(activeSelectedCentro.padre)?.descripcion ?? "Sin descripción"}`
                      : "Sin padre",
                  },
                  {
                    label: "Ruta jerárquica",
                    value: getCentroPath(activeSelectedCentro, parentById),
                  },
                  {
                    label: "Dependencias visibles",
                    value: String(childrenCount.get(activeSelectedCentro.id) ?? 0),
                  },
                  {
                    label: "Profundidad",
                    value: `Nivel ${getIndentLevel(activeSelectedCentro, parentById) + 1}`,
                  },
                  {
                    label: "Estado",
                    value: activeSelectedCentro.activo ? "Activo" : "Inactivo",
                  },
                ]}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <GitBranch className="h-4 w-4" /> Estado operativo
                </div>
                <p className="mt-3 font-semibold">{selectedCentroStatus?.label}</p>
                <p className="mt-2 text-sm text-muted-foreground">{selectedCentroStatus?.detail}</p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Waypoints className="h-4 w-4" /> Circuito
                </div>
                <p className="mt-3 font-semibold">{selectedCentroCircuit?.label}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {selectedCentroCircuit?.detail}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldAlert className="h-4 w-4" /> Cobertura legacy
                </div>
                <p className="mt-3 font-semibold">{selectedCentroCoverage?.label}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {selectedCentroCoverage?.detail}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Árbol de centros</CardTitle>
            </div>
            <CardDescription>
              {filtered.length} centros en la vista actual. Seleccioná una fila para inspeccionar o
              editar el registro.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Padre</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      Cargando centros de costo...
                    </TableCell>
                  </TableRow>
                )}
                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      No hay centros de costo para los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  filtered.map((centro) => {
                    const parent = centro.padre ? parentById.get(centro.padre) : null
                    const level = getIndentLevel(centro, parentById)
                    const isSelected = selectedId === centro.id

                    return (
                      <TableRow
                        key={centro.id}
                        className={isSelected ? "bg-accent/40" : undefined}
                        onClick={() => setSelectedId(centro.id)}
                      >
                        <TableCell className="font-mono font-medium">{centro.codigo}</TableCell>
                        <TableCell className={getIndentClass(level)}>
                          {centro.descripcion}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {parent ? `${parent.codigo} · ${parent.descripcion}` : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={centro.activo ? "default" : "secondary"}>
                            {centro.activo ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selectedCentro ? selectedCentro.descripcion : "Detalle del centro"}
            </CardTitle>
            <CardDescription>
              {selectedCentro
                ? `${selectedCentro.codigo} · datos listos para mantenimiento directo.`
                : "Seleccioná un centro para revisar su estructura y editarlo."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeSelectedCentro ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Código</p>
                    <p className="mt-2 font-mono text-lg font-semibold">
                      {activeSelectedCentro.codigo}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Estado</p>
                    <div className="mt-2">
                      <Badge variant={activeSelectedCentro.activo ? "default" : "secondary"}>
                        {activeSelectedCentro.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Centro padre</p>
                    <p className="mt-2 font-medium">
                      {activeSelectedCentro.padre
                        ? (parentById.get(activeSelectedCentro.padre)?.descripcion ??
                          `#${activeSelectedCentro.padre}`)
                        : "Sin padre"}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Dependencias</p>
                    <p className="mt-2 text-lg font-semibold">
                      {childrenCount.get(activeSelectedCentro.id) ?? 0}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">Mapa jerárquico</p>
                      <p className="text-sm text-muted-foreground">
                        {activeSelectedCentro.padre
                          ? `Depende de ${parentById.get(activeSelectedCentro.padre)?.descripcion ?? `#${activeSelectedCentro.padre}`}.`
                          : "Este centro se encuentra en la raíz del árbol."}
                      </p>
                    </div>
                    <Waypoints className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{selectedCentroCoverage?.detail}</p>
                  <p className="mt-2">
                    El contrato actual permite mantener el árbol, el estado y las relaciones padre.
                    Los bloques heredados de presupuesto, responsable o analítica extendida siguen
                    fuera de la API y quedan documentados como pendiente de cobertura.
                  </p>
                </div>

                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => openEdit(activeSelectedCentro)}
                >
                  <Pencil className="h-4 w-4" />
                  Editar centro seleccionado
                </Button>
              </>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No hay un centro seleccionado en la vista actual.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create" ? "Nuevo centro de costo" : "Editar centro de costo"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "create"
                ? "Registrá un nuevo nodo para el árbol de centros usando el endpoint existente."
                : "Actualizá descripción, relación padre y estado del centro seleccionado."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="centro-codigo">Código</Label>
                <Input
                  id="centro-codigo"
                  value={draft.codigo}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, codigo: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="centro-padre">Centro padre</Label>
                <Select
                  value={draft.padre}
                  onValueChange={(value) => setDraft((current) => ({ ...current, padre: value }))}
                >
                  <SelectTrigger id="centro-padre" className="w-full">
                    <SelectValue placeholder="Sin padre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin padre</SelectItem>
                    {centrosCosto
                      .filter((centro) => !draft.id || centro.id !== draft.id)
                      .map((centro) => (
                        <SelectItem key={centro.id} value={String(centro.id)}>
                          {centro.codigo} · {centro.descripcion}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="centro-descripcion">Descripción</Label>
              <Input
                id="centro-descripcion"
                value={draft.descripcion}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, descripcion: event.target.value }))
                }
              />
            </div>

            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Switch
                id="centro-activo"
                checked={draft.activo}
                onCheckedChange={(checked) =>
                  setDraft((current) => ({ ...current, activo: checked }))
                }
              />
              <Label htmlFor="centro-activo">Centro activo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving
                ? "Guardando..."
                : dialogMode === "create"
                  ? "Crear centro"
                  : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
