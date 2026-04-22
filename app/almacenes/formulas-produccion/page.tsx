"use client"

import { useMemo, useState } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  WmsDetailFieldGrid,
  WmsDialogContent,
  WmsTabsList,
} from "@/components/almacenes/wms-responsive"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useFormulasProduccion } from "@/lib/hooks/useFormulasProduccion"
import type {
  FormulaProduccion,
  FormulaProduccionHistorial,
} from "@/lib/types/formulas-produccion"
import { AlertCircle, Eye, Pencil, Plus, RefreshCcw, Search } from "lucide-react"

type ComponentDraft = {
  itemId: string
  cantidad: string
}

function emptyComponent(): ComponentDraft {
  return { itemId: "", cantidad: "" }
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

function getFormulaStatus(formula: FormulaProduccion) {
  if (!formula.activa) return "Fuera de circuito"
  if ((formula.componentes?.length ?? 0) >= 3 && formula.codigo) return "Ficha tecnica completa"
  if ((formula.componentes?.length ?? 0) > 0) return "Ficha operativa"
  return "Ficha base"
}

function getComponentCoverage(formula: FormulaProduccion) {
  const count = formula.componentes?.length ?? 0

  if (count === 0) return "Sin insumos visibles"
  if (count === 1) return "Formula simple"
  if (count <= 3) return "Formula compuesta"
  return "Formula extendida"
}

function formatHistoryTimestamp(value?: string) {
  if (!value) return "Sin fecha visible"

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("es-AR")
}

export default function FormulasProduccionPage() {
  const [soloActivas, setSoloActivas] = useState(false)
  const {
    formulas,
    loading,
    error,
    getById,
    getHistorial,
    crear,
    actualizar,
    activar,
    desactivar,
    refetch,
  } = useFormulasProduccion(soloActivas)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState<FormulaProduccion | null>(null)
  const [detailHistory, setDetailHistory] = useState<FormulaProduccionHistorial[]>([])
  const [detailHistoryLoading, setDetailHistoryLoading] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingFormulaId, setEditingFormulaId] = useState<number | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busyStateId, setBusyStateId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [draft, setDraft] = useState({
    codigo: "",
    descripcion: "",
    itemProductoId: "",
    cantidadProducida: "",
    activa: true,
    observacion: "",
  })
  const [editDraft, setEditDraft] = useState({
    descripcion: "",
    cantidadProducida: "",
    observacion: "",
  })
  const [componentes, setComponentes] = useState<ComponentDraft[]>([emptyComponent()])

  const filtered = useMemo(
    () =>
      formulas.filter((formula) => {
        const term = searchTerm.trim().toLowerCase()
        return (
          !term ||
          (formula.codigo ?? "").toLowerCase().includes(term) ||
          formula.descripcion.toLowerCase().includes(term) ||
          String(formula.itemProductoId).includes(term)
        )
      }),
    [formulas, searchTerm]
  )

  const activas = formulas.filter((formula) => formula.activa).length
  const totalComponentes = formulas.reduce(
    (sum, formula) => sum + (formula.componentes?.length ?? 0),
    0
  )
  const promedioComponentes =
    formulas.length > 0 ? (totalComponentes / formulas.length).toFixed(1) : "0.0"
  const conCodigo = formulas.filter((formula) => Boolean(formula.codigo)).length
  const extendidas = formulas.filter((formula) => (formula.componentes?.length ?? 0) >= 3).length

  const selected = useMemo(
    () => filtered.find((formula) => formula.id === selectedId) ?? null,
    [filtered, selectedId]
  )

  const selectedCircuit = selected ? getFormulaStatus(selected) : "-"
  const featuredFormula = selected ?? filtered[0] ?? null

  const handleOpenDetail = async (id: number) => {
    setDetailOpen(true)
    setDetailLoading(true)
    setDetailHistoryLoading(true)
    const [data, history] = await Promise.all([getById(id), getHistorial(id)])
    setDetail(data)
    setDetailHistory(history)
    setDetailLoading(false)
    setDetailHistoryLoading(false)
  }

  const openEdit = (formula: FormulaProduccion | null) => {
    if (!formula) return

    setEditingFormulaId(formula.id)
    setEditDraft({
      descripcion: formula.descripcion,
      cantidadProducida: String(formula.cantidadProducida),
      observacion: formula.observacion ?? "",
    })
    setActionError(null)
    setEditOpen(true)
  }

  const addComponent = () => {
    setComponentes((prev) => [...prev, emptyComponent()])
  }

  const updateComponent = (index: number, field: keyof ComponentDraft, value: string) => {
    setComponentes((prev) =>
      prev.map((component, componentIndex) =>
        componentIndex === index ? { ...component, [field]: value } : component
      )
    )
  }

  const removeComponent = (index: number) => {
    setComponentes((prev) =>
      prev.length === 1 ? prev : prev.filter((_, componentIndex) => componentIndex !== index)
    )
  }

  const resetCreate = () => {
    setDraft({
      codigo: "",
      descripcion: "",
      itemProductoId: "",
      cantidadProducida: "",
      activa: true,
      observacion: "",
    })
    setComponentes([emptyComponent()])
  }

  const handleCreate = async () => {
    setActionError(null)

    if (
      !draft.codigo.trim() ||
      !draft.descripcion.trim() ||
      !draft.itemProductoId ||
      !draft.cantidadProducida
    ) {
      setActionError(
        "Completá código, descripción, producto y cantidad producida para registrar la fórmula."
      )
      return
    }

    const itemProductoId = Number(draft.itemProductoId)
    const cantidadProducida = Number(draft.cantidadProducida)

    if (Number.isNaN(itemProductoId) || itemProductoId <= 0) {
      setActionError("El producto final debe ser un identificador numérico válido.")
      return
    }

    if (Number.isNaN(cantidadProducida) || cantidadProducida <= 0) {
      setActionError("La cantidad producida debe ser mayor a cero.")
      return
    }

    const incompleteComponents = componentes.filter((component) => {
      const started = Boolean(component.itemId || component.cantidad)
      if (!started) {
        return false
      }

      const itemId = Number(component.itemId)
      const cantidad = Number(component.cantidad)

      return (
        !component.itemId ||
        !component.cantidad ||
        Number.isNaN(itemId) ||
        itemId <= 0 ||
        Number.isNaN(cantidad) ||
        cantidad <= 0
      )
    })

    if (incompleteComponents.length > 0) {
      setActionError(
        "Revisá los componentes: cada línea iniciada debe tener item y cantidad válida mayor a cero."
      )
      return
    }

    const componentesValidos = componentes
      .filter((component) => component.itemId && component.cantidad)
      .map((component) => ({
        itemId: Number(component.itemId),
        cantidad: Number(component.cantidad),
      }))

    if (componentesValidos.length === 0) {
      setActionError("Agregá al menos un componente válido para la fórmula de producción.")
      return
    }

    setSaving(true)
    const createdId = await crear({
      codigo: draft.codigo.trim(),
      descripcion: draft.descripcion.trim(),
      itemProductoId,
      cantidadProducida,
      activa: draft.activa,
      observacion: draft.observacion.trim() || null,
      componentes: componentesValidos,
    })
    setSaving(false)

    if (!createdId) {
      setActionError("No se pudo crear la fórmula de producción.")
      return
    }

    setCreateOpen(false)
    resetCreate()
    setSelectedId(createdId)
  }

  const handleEdit = async () => {
    if (!editingFormulaId) return

    setActionError(null)

    if (!editDraft.descripcion.trim()) {
      setActionError("La descripción sigue siendo obligatoria para actualizar la fórmula.")
      return
    }

    const cantidad = Number(editDraft.cantidadProducida)
    if (Number.isNaN(cantidad) || cantidad <= 0) {
      setActionError("La cantidad producida debe ser mayor a cero para actualizar la fórmula.")
      return
    }

    setEditSaving(true)
    const ok = await actualizar(editingFormulaId, {
      descripcion: editDraft.descripcion.trim(),
      cantidadProducida: cantidad,
      observacion: editDraft.observacion.trim() || null,
    })

    if (!ok) {
      setActionError("No se pudo actualizar la fórmula de producción.")
      setEditSaving(false)
      return
    }

    if (detail?.id === editingFormulaId) {
      setDetailLoading(true)
      setDetailHistoryLoading(true)
      const [nextDetail, nextHistory] = await Promise.all([
        getById(editingFormulaId),
        getHistorial(editingFormulaId),
      ])
      setDetail(nextDetail)
      setDetailHistory(nextHistory)
      setDetailLoading(false)
      setDetailHistoryLoading(false)
    }

    setEditSaving(false)
    setEditOpen(false)
    setEditingFormulaId(null)
  }

  const handleToggleEstado = async (formula: FormulaProduccion) => {
    setBusyStateId(formula.id)
    setActionError(null)

    const ok = formula.activa ? await desactivar(formula.id) : await activar(formula.id)

    if (!ok) {
      setActionError(
        formula.activa
          ? "No se pudo desactivar la fórmula seleccionada."
          : "No se pudo activar la fórmula seleccionada."
      )
      setBusyStateId(null)
      return
    }

    if (detail?.id === formula.id) {
      setDetailLoading(true)
      setDetailHistoryLoading(true)
      const [nextDetail, nextHistory] = await Promise.all([
        getById(formula.id),
        getHistorial(formula.id),
      ])
      setDetail(nextDetail)
      setDetailHistory(nextHistory)
      setDetailLoading(false)
      setDetailHistoryLoading(false)
    }

    setBusyStateId(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fórmulas de producción</h1>
          <p className="text-muted-foreground">
            Consola técnica para definir recetas productivas, revisar su composición y crear nuevas
            fórmulas con los endpoints reales disponibles.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={refetch} disabled={loading}>
            <RefreshCcw className="h-4 w-4" />
            Actualizar
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Nueva fórmula
          </Button>
        </div>
      </div>

      {(error || actionError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{actionError || error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total fórmulas"
          value={String(formulas.length)}
          description={
            soloActivas ? "Vista sólo de fórmulas activas." : "Incluye activas e inactivas."
          }
        />
        <SummaryCard
          title="Activas"
          value={String(activas)}
          description="Disponibles para planificar órdenes de trabajo."
        />
        <SummaryCard
          title="Componentes totales"
          value={String(totalComponentes)}
          description="Relaciones componente-producto cargadas en la vista actual."
        />
        <SummaryCard
          title="Promedio de componentes"
          value={promedioComponentes}
          description="Cantidad media de insumos por fórmula visible."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Con codigo"
          value={String(conCodigo)}
          description="Formulas con identificacion visible del legado tecnico."
        />
        <SummaryCard
          title="Extendidas"
          value={String(extendidas)}
          description="Formulas con tres o mas componentes visibles."
        />
        <SummaryCard
          title="Circuito seleccionado"
          value={selectedCircuit}
          description="Lectura tecnica de la formula actualmente seleccionada."
        />
        <SummaryCard
          title="Cobertura seleccionada"
          value={selected ? getComponentCoverage(selected) : "-"}
          description="Complejidad visible de la receta activa."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card className="border-emerald-200 bg-linear-to-br from-emerald-50 via-background to-lime-50">
          <CardHeader>
            <CardDescription>Radar técnico</CardDescription>
            <CardTitle className="text-xl">
              {featuredFormula
                ? `${featuredFormula.codigo ?? "Sin código"} · ${featuredFormula.descripcion}`
                : "Sin fórmulas visibles en la consulta"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {featuredFormula ? (
              <>
                <p className="max-w-3xl text-sm text-muted-foreground">
                  La receta destacada resume el nivel de terminación técnica visible en el módulo:
                  código, estado activo y cobertura de componentes en una sola lectura.
                </p>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-emerald-200 bg-white/80 p-4">
                    <p className="text-xs uppercase tracking-wide text-emerald-900/70">Circuito</p>
                    <p className="mt-2 text-sm font-semibold text-emerald-950">
                      {getFormulaStatus(featuredFormula)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-white/80 p-4">
                    <p className="text-xs uppercase tracking-wide text-emerald-900/70">
                      Componentes
                    </p>
                    <p className="mt-2 text-sm font-semibold text-emerald-950">
                      {featuredFormula.componentes?.length ?? 0} visibles
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-white/80 p-4">
                    <p className="text-xs uppercase tracking-wide text-emerald-900/70">Estado</p>
                    <p className="mt-2 text-sm font-semibold text-emerald-950">
                      {featuredFormula.activa ? "Activa" : "Inactiva"}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-emerald-200 bg-white/70 p-5 text-sm text-muted-foreground">
                Ajustá los filtros o creá una fórmula para volver a poblar el radar técnico.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-linear-to-br from-slate-50 via-background to-stone-50">
          <CardHeader>
            <CardDescription>Fórmula enfocada</CardDescription>
            <CardTitle className="text-xl">
              {selected
                ? `${selected.codigo ?? "Sin código"} · ${selected.descripcion}`
                : "Selecciona una fórmula para ver su lectura lateral"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selected ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={selected.activa ? "default" : "secondary"}>
                    {selected.activa ? "Activa" : "Inactiva"}
                  </Badge>
                  <Badge variant="outline">{getFormulaStatus(selected)}</Badge>
                  <Badge variant="outline">{getComponentCoverage(selected)}</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border bg-white/80 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Producto</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      #{selected.itemProductoId}
                    </p>
                  </div>
                  <div className="rounded-xl border bg-white/80 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Cantidad base</p>
                    <p className="mt-2 text-lg font-semibold text-slate-950">
                      {selected.cantidadProducida}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  La selección lateral queda alineada con la tabla principal y con el detalle
                  expandido del diálogo técnico.
                </p>
              </>
            ) : (
              <div className="rounded-xl border border-dashed bg-white/70 p-5 text-sm text-muted-foreground">
                La tabla de recetas resalta la selección activa para sostener la lectura visual del
                circuito productivo.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros y visibilidad</CardTitle>
          <CardDescription>
            Buscá por código, descripción o producto y controlá si querés limitar la consulta a
            fórmulas activas.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, descripción o producto ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{filtered.length} visibles</Badge>
              <Badge variant="outline">{extendidas} extendidas</Badge>
              <Badge variant="outline">{conCodigo} con código</Badge>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Switch id="solo-activas" checked={soloActivas} onCheckedChange={setSoloActivas} />
            <Label htmlFor="solo-activas">Consultar sólo fórmulas activas</Label>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recetas productivas</CardTitle>
            <CardDescription>
              {filtered.length} fórmulas en la vista actual. Seleccioná una para revisar su
              composición.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Producto ID</TableHead>
                  <TableHead>Cant. producida</TableHead>
                  <TableHead>Componentes</TableHead>
                  <TableHead>Circuito</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Cargando fórmulas...
                    </TableCell>
                  </TableRow>
                )}
                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No hay fórmulas para los filtros actuales.
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  filtered.map((formula) => (
                    <TableRow
                      key={formula.id}
                      className={formula.id === selectedId ? "bg-accent/40" : undefined}
                      onClick={() => setSelectedId(formula.id)}
                    >
                      <TableCell className="font-mono text-sm">{formula.codigo ?? "-"}</TableCell>
                      <TableCell className="font-medium">{formula.descripcion}</TableCell>
                      <TableCell>#{formula.itemProductoId}</TableCell>
                      <TableCell>{formula.cantidadProducida}</TableCell>
                      <TableCell>{formula.componentes?.length ?? 0}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-xs">
                            {getFormulaStatus(formula)}
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            {getComponentCoverage(formula)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={formula.activa ? "default" : "secondary"}>
                          {formula.activa ? "Activa" : "Inactiva"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 h-7 px-2 text-xs"
                          disabled={busyStateId === formula.id}
                          onClick={async (event) => {
                            event.stopPropagation()
                            await handleToggleEstado(formula)
                          }}
                        >
                          {busyStateId === formula.id
                            ? "Actualizando..."
                            : formula.activa
                              ? "Desactivar"
                              : "Activar"}
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
            <CardTitle className="text-base">
              {selected ? selected.descripcion : "Detalle de fórmula"}
            </CardTitle>
            <CardDescription>
              {selected
                ? `${selected.codigo ?? "Sin código"} · producto #${selected.itemProductoId}`
                : "Seleccioná una fórmula para revisar su composición."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selected ? (
              <>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-emerald-900">Lectura activa</p>
                      <p className="mt-1 text-lg font-semibold text-emerald-950">
                        {selected.codigo ?? "Sin código"} · producto #{selected.itemProductoId}
                      </p>
                      {selected.itemProductoDescripcion ? (
                        <p className="mt-1 text-sm text-emerald-900/80">
                          {selected.itemProductoDescripcion}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={selected.activa ? "default" : "secondary"}>
                        {selected.activa ? "Activa" : "Inactiva"}
                      </Badge>
                      <Badge variant="outline">{getComponentCoverage(selected)}</Badge>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => openEdit(selected)}>
                    <Pencil className="h-4 w-4" />
                    Editar datos base
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void handleToggleEstado(selected)}
                    disabled={busyStateId === selected.id}
                  >
                    {busyStateId === selected.id
                      ? "Actualizando estado..."
                      : selected.activa
                        ? "Desactivar fórmula"
                        : "Activar fórmula"}
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Cantidad producida</p>
                    <p className="mt-2 text-lg font-semibold">{selected.cantidadProducida}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Estado</p>
                    <div className="mt-2">
                      <Badge variant={selected.activa ? "default" : "secondary"}>
                        {selected.activa ? "Activa" : "Inactiva"}
                      </Badge>
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Estado tecnico</p>
                    <p className="mt-2 font-medium">{getFormulaStatus(selected)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Cobertura de insumos</p>
                    <p className="mt-2 font-medium">{getComponentCoverage(selected)}</p>
                  </div>
                  <div className="rounded-lg border p-3 sm:col-span-2">
                    <p className="text-sm text-muted-foreground">Observación</p>
                    <p className="mt-2 font-medium">
                      {selected.observacion?.trim() || "Sin observación operativa registrada."}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Resumen de componentes</p>
                  {(selected.componentes ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      La vista actual no trae componentes expandidos para esta fórmula.
                    </p>
                  ) : (
                    (selected.componentes ?? []).map((componente) => (
                      <div
                        key={componente.id}
                        className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {componente.itemDescripcion ?? `Item #${componente.itemId}`}
                          </p>
                          <p className="text-xs text-muted-foreground">ID {componente.itemId}</p>
                        </div>
                        <span className="font-mono text-sm">{componente.cantidad}</span>
                      </div>
                    ))
                  )}
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleOpenDetail(selected.id)}
                >
                  <Eye className="h-4 w-4" />
                  Ver detalle completo
                </Button>
              </>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No hay fórmula seleccionada.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <WmsDialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Detalle de fórmula de producción</DialogTitle>
            <DialogDescription>
              Consulta puntual del backend para revisar componentes y producto final.
            </DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <p className="text-sm text-muted-foreground">Cargando detalle...</p>
          ) : detail ? (
            <Tabs defaultValue="general">
              <WmsTabsList className="md:grid-cols-4">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="componentes">Componentes</TabsTrigger>
                <TabsTrigger value="circuito">Circuito</TabsTrigger>
                <TabsTrigger value="historial">Historial</TabsTrigger>
              </WmsTabsList>

              <TabsContent value="general" className="mt-4 space-y-4">
                <WmsDetailFieldGrid
                  columns="2"
                  fields={[
                    { label: "Código", value: detail.codigo ?? "-" },
                    {
                      label: "Producto",
                      value: (
                        <>
                          <span className="block">#{detail.itemProductoId}</span>
                          {detail.itemProductoDescripcion ? (
                            <span className="mt-1 block text-xs font-normal text-muted-foreground">
                              {detail.itemProductoDescripcion}
                            </span>
                          ) : null}
                        </>
                      ),
                    },
                    { label: "Cantidad producida", value: detail.cantidadProducida },
                    { label: "Estado", value: detail.activa ? "Activa" : "Inactiva" },
                    {
                      label: "Observación",
                      value: detail.observacion ?? "Sin observaciones visibles",
                      className: "md:col-span-2",
                    },
                  ]}
                />
              </TabsContent>

              <TabsContent value="componentes" className="mt-4 space-y-2">
                <p className="text-sm text-muted-foreground">Componentes detallados</p>
                {(detail.componentes ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No hay componentes detallados cargados.
                  </p>
                ) : (
                  (detail.componentes ?? []).map((componente) => (
                    <div key={componente.id} className="rounded-lg bg-muted/40 p-3">
                      <p className="text-sm font-medium">
                        {componente.itemDescripcion ?? `Item #${componente.itemId}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Cantidad: {componente.cantidad}
                      </p>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="circuito" className="mt-4">
                <WmsDetailFieldGrid
                  columns="2"
                  fields={[
                    { label: "Estado técnico", value: getFormulaStatus(detail) },
                    { label: "Cobertura de insumos", value: getComponentCoverage(detail) },
                    {
                      label: "Lectura operativa",
                      value: detail.activa
                        ? "Fórmula disponible para planificación y órdenes de trabajo visibles."
                        : "Fórmula fuera del circuito activo, mantenida solo para consulta técnica.",
                      className: "md:col-span-2",
                    },
                  ]}
                />
              </TabsContent>

              <TabsContent value="historial" className="mt-4 space-y-3">
                {detailHistoryLoading ? (
                  <p className="text-sm text-muted-foreground">Cargando historial...</p>
                ) : detailHistory.length ? (
                  detailHistory.map((entry) => (
                    <div key={entry.id} className="rounded-lg bg-muted/40 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">
                            Versión {entry.version} · {entry.descripcion || "Sin descripción"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {entry.motivo ?? "Sin motivo informado"} · {formatHistoryTimestamp(entry.createdAt)}
                          </p>
                        </div>
                        <Badge variant="outline">{entry.cantidadResultado}</Badge>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {entry.codigo ? `Código ${entry.codigo}` : "Sin código histórico visible"}
                        {entry.createdBy !== null && entry.createdBy !== undefined
                          ? ` · usuario ${entry.createdBy}`
                          : ""}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No hay historial visible para la fórmula seleccionada.
                  </p>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <p className="text-sm text-muted-foreground">
              No se pudo recuperar el detalle solicitado.
            </p>
          )}
          <DialogFooter>
            {detail ? (
              <Button variant="outline" onClick={() => openEdit(detail)}>
                <Pencil className="h-4 w-4" />
                Editar datos base
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </WmsDialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) {
            setEditingFormulaId(null)
            setActionError(null)
          }
        }}
      >
          <WmsDialogContent size="md">
            <DialogHeader>
              <DialogTitle>Editar datos base de la fórmula</DialogTitle>
              <DialogDescription>
                El backend hoy permite ajustar descripción, cantidad producida y observación. La
                composición de componentes sigue en solo lectura en esta iteración.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-descripcion">Descripción</Label>
                <Input
                  id="edit-descripcion"
                  value={editDraft.descripcion}
                  onChange={(e) =>
                    setEditDraft((prev) => ({ ...prev, descripcion: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cantidad">Cantidad producida</Label>
                <Input
                  id="edit-cantidad"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editDraft.cantidadProducida}
                  onChange={(e) =>
                    setEditDraft((prev) => ({ ...prev, cantidadProducida: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-observacion">Observación</Label>
                <Textarea
                  id="edit-observacion"
                  value={editDraft.observacion}
                  onChange={(e) =>
                    setEditDraft((prev) => ({ ...prev, observacion: e.target.value }))
                  }
                  placeholder="Contexto técnico u operativo visible para esta versión"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => void handleEdit()} disabled={editSaving}>
                {editSaving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </WmsDialogContent>
      </Dialog>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) {
            resetCreate()
            setActionError(null)
          }
        }}
      >
        <WmsDialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Nueva fórmula de producción</DialogTitle>
            <DialogDescription>
              Registrá la receta técnica indicando producto final, cantidad producida y sus
              componentes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código</Label>
                <Input
                  id="codigo"
                  value={draft.codigo}
                  onChange={(e) => setDraft((prev) => ({ ...prev, codigo: e.target.value }))}
                  placeholder="F-001"
                />
                <p className="text-xs text-muted-foreground">
                  Si existe, conviene conservar el codigo tecnico visible para facilitar la
                  migracion del legado.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-producto">Producto ID</Label>
                <Input
                  id="item-producto"
                  type="number"
                  min={1}
                  value={draft.itemProductoId}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, itemProductoId: e.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Este ID vincula la receta con el producto final actualmente expuesto por backend.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Input
                  id="descripcion"
                  value={draft.descripcion}
                  onChange={(e) => setDraft((prev) => ({ ...prev, descripcion: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  La descripcion deberia reflejar la receta o formulacion que el usuario reconocia
                  en el sistema anterior.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cantidad-producida">Cantidad producida</Label>
                <Input
                  id="cantidad-producida"
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.cantidadProducida}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, cantidadProducida: e.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Representa el rendimiento base visible de la formula en el frontend actual.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="observacion">Observación</Label>
              <Textarea
                id="observacion"
                value={draft.observacion}
                onChange={(e) => setDraft((prev) => ({ ...prev, observacion: e.target.value }))}
                placeholder="Notas técnicas, equivalencias del legado o contexto operativo"
              />
              <p className="text-xs text-muted-foreground">
                Conviene dejar aquí la referencia técnica que el usuario reconocía en el circuito
                anterior.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Switch
                id="formula-activa"
                checked={draft.activa}
                onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, activa: checked }))}
              />
              <Label htmlFor="formula-activa">Fórmula activa</Label>
            </div>
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium">Componentes</p>
                  <p className="text-sm text-muted-foreground">
                    Cargá IDs y cantidades de los insumos que forman la receta.
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={addComponent}>
                  <Plus className="h-4 w-4" />
                  Agregar
                </Button>
              </div>
              {componentes.map((component, index) => (
                <div key={index} className="grid gap-3 sm:grid-cols-[180px_180px_auto]">
                  <Input
                    type="number"
                    min={1}
                    value={component.itemId}
                    onChange={(e) => updateComponent(index, "itemId", e.target.value)}
                    placeholder="Item ID"
                  />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={component.cantidad}
                    onChange={(e) => updateComponent(index, "cantidad", e.target.value)}
                    placeholder="Cantidad"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => removeComponent(index)}
                    disabled={componentes.length === 1}
                  >
                    Quitar
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Guardando..." : "Crear fórmula"}
            </Button>
          </DialogFooter>
        </WmsDialogContent>
      </Dialog>
    </div>
  )
}
