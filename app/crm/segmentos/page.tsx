"use client"

import React, { Suspense, useMemo, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
  Filter,
  Tag,
  ArrowRight,
  Megaphone,
  Target,
} from "lucide-react"
import { useCrmSegmentos, useCrmCampanas, useCrmClientes } from "@/lib/hooks/useCrm"
import type { CRMClient, CRMSegment, SegmentCriteria } from "@/lib/types"

const tipoLabels: Record<CRMSegment["tipoSegmento"], string> = {
  estatico: "Estático",
  dinamico: "Dinámico",
}

const segmentFieldLabels: Record<string, string> = {
  segmento: "Segmento",
  tipoCliente: "Tipo de cliente",
  industria: "Industria",
  estadoRelacion: "Estado de relación",
}

const segmentValueLabels: Record<string, string> = {
  pyme: "PYME",
  corporativo: "Corporativo",
  gobierno: "Gobierno",
  startup: "Startup",
  otro: "Otro",
  prospecto: "Prospecto",
  activo: "Activo",
  inactivo: "Inactivo",
  perdido: "Perdido",
  nuevo: "Nuevo",
  en_negociacion: "En negociación",
  en_riesgo: "En riesgo",
  fidelizado: "Fidelizado",
}

const operatorLabels: Record<SegmentCriteria["operador"], string> = {
  igual: "igual a",
  contiene: "contiene",
  mayor_que: "mayor que",
  menor_que: "menor que",
  entre: "entre",
}

const getCriterionSummary = (criteria: SegmentCriteria[]) => {
  if (!criteria.length) return "Sin criterios visibles"

  return criteria
    .slice(0, 2)
    .map((criterion) => {
      const field = segmentFieldLabels[criterion.campo] ?? criterion.campo
      const value = segmentValueLabels[String(criterion.valor)] ?? String(criterion.valor)
      return `${field} ${operatorLabels[criterion.operador]} ${value}`
    })
    .join(" · ")
}

const normalizeComparableValue = (value: unknown) => {
  if (value === null || value === undefined) return ""
  if (typeof value === "string") return value.toLowerCase()
  if (typeof value === "number") return value
  return String(value).toLowerCase()
}

const matchesCriterion = (client: CRMClient, criterion: SegmentCriteria) => {
  const rawValue = client[criterion.campo as keyof CRMClient]
  const clientValue = normalizeComparableValue(rawValue)
  const criterionValue = normalizeComparableValue(criterion.valor)

  switch (criterion.operador) {
    case "igual":
      return clientValue === criterionValue
    case "contiene":
      return String(clientValue).includes(String(criterionValue))
    case "mayor_que":
      return Number(clientValue) > Number(criterionValue)
    case "menor_que":
      return Number(clientValue) < Number(criterionValue)
    case "entre":
      return false
    default:
      return false
  }
}

function SegmentosContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const action = searchParams.get("action")

  const [search, setSearch] = useState("")
  const [filterTipo, setFilterTipo] = useState<string>("all")
  const [isFormOpen, setIsFormOpen] = useState(action === "new")
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedSegment, setSelectedSegment] = useState<CRMSegment | null>(null)
  const { segmentos, loading, error, createSegmento, updateSegmento, deleteSegmento } =
    useCrmSegmentos()
  const { campanas } = useCrmCampanas()
  const { clientes } = useCrmClientes()

  const emptyForm: Partial<CRMSegment> = {
    nombre: "",
    descripcion: "",
    tipoSegmento: "estatico",
    criterios: [],
    cantidadClientes: 0,
  }

  const [formData, setFormData] = useState<Partial<CRMSegment>>(emptyForm)

  const filteredSegments = segmentos.filter((segment) => {
    const matchesSearch = segment.nombre.toLowerCase().includes(search.toLowerCase())
    const matchesTipo = filterTipo === "all" || segment.tipoSegmento === filterTipo
    return matchesSearch && matchesTipo
  })

  const segmentRows = useMemo(() => {
    return filteredSegments.map((segment) => {
      const relatedCampaigns = campanas.filter(
        (campaign) => campaign.segmentoObjetivoId === segment.id
      )
      const visibleClients = segment.criterios.length
        ? clientes.filter((client) =>
            segment.criterios.every((criterion) => matchesCriterion(client, criterion))
          )
        : []
      const budget = relatedCampaigns.reduce(
        (sum, campaign) => sum + Number(campaign.presupuestoEstimado ?? 0),
        0
      )
      const spent = relatedCampaigns.reduce(
        (sum, campaign) => sum + Number(campaign.presupuestoGastado ?? 0),
        0
      )
      const score =
        relatedCampaigns.length +
        Math.abs(segment.cantidadClientes - visibleClients.length) +
        segment.criterios.length

      return {
        segment,
        relatedCampaigns,
        visibleClients,
        budget,
        spent,
        score,
        criteriaSummary: getCriterionSummary(segment.criterios),
      }
    })
  }, [campanas, clientes, filteredSegments])

  const stats = useMemo(() => {
    return {
      total: segmentRows.length,
      estaticos: segmentRows.filter(({ segment }) => segment.tipoSegmento === "estatico").length,
      dinamicos: segmentRows.filter(({ segment }) => segment.tipoSegmento === "dinamico").length,
      totalClientes: segmentRows.reduce((sum, row) => sum + row.segment.cantidadClientes, 0),
    }
  }, [segmentRows])

  const alerts = useMemo(() => {
    const items: Array<{ title: string; detail: string }> = []
    const withCampaigns = segmentRows.filter((row) => row.relatedCampaigns.length > 0).length
    const mismatchedCoverage = segmentRows.filter(
      (row) =>
        row.segment.criterios.length > 0 &&
        row.visibleClients.length !== row.segment.cantidadClientes
    ).length
    const withoutCriteria = segmentRows.filter((row) => row.segment.criterios.length === 0).length

    if (mismatchedCoverage > 0) {
      items.push({
        title: "Cobertura inconsistente",
        detail: `${mismatchedCoverage} segmentos dinámicos no coinciden entre cantidad declarada y clientes visibles por criterio.`,
      })
    }

    if (withoutCriteria > 0) {
      items.push({
        title: "Segmentos sin criterio",
        detail: `${withoutCriteria} segmentos no muestran reglas visibles y dependen de mantenimiento manual.`,
      })
    }

    if (withCampaigns > 0) {
      items.push({
        title: "Uso comercial",
        detail: `${withCampaigns} segmentos visibles están siendo utilizados por campañas activas o históricas.`,
      })
    }

    if (!items.length) {
      items.push({
        title: "Sin alertas críticas",
        detail: "La cartera visible de segmentos no muestra desvíos operativos relevantes.",
      })
    }

    return items.slice(0, 4)
  }, [segmentRows])

  const criteriaCoverage = useMemo(() => {
    return Object.entries(
      segmentRows.reduce<Record<string, number>>((acc, row) => {
        row.segment.criterios.forEach((criterion) => {
          acc[criterion.campo] = (acc[criterion.campo] ?? 0) + 1
        })
        return acc
      }, {})
    )
      .sort((left, right) => right[1] - left[1])
      .slice(0, 4)
  }, [segmentRows])

  const highlightedSegment = useMemo(() => {
    const sorted = [...segmentRows].sort(
      (left, right) =>
        right.score - left.score || right.relatedCampaigns.length - left.relatedCampaigns.length
    )
    return sorted[0] ?? null
  }, [segmentRows])

  const getTipoColor = (tipo: CRMSegment["tipoSegmento"]) => {
    return tipo === "estatico" ? "bg-slate-500/20 text-slate-400" : "bg-blue-500/20 text-blue-400"
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date)
  }

  const openNewForm = () => {
    setSelectedSegment(null)
    setFormData(emptyForm)
    setIsFormOpen(true)
  }

  const handleEdit = (segment: CRMSegment) => {
    setSelectedSegment(segment)
    setFormData({ ...segment })
    setIsFormOpen(true)
  }

  const handleDelete = (segment: CRMSegment) => {
    setSelectedSegment(segment)
    setIsDeleteOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedSegment) {
      await updateSegmento(selectedSegment.id, formData)
    } else {
      await createSegmento(formData as Omit<CRMSegment, "id" | "createdAt" | "updatedAt">)
    }
    closeForm()
  }

  const confirmDelete = async () => {
    if (selectedSegment) {
      await deleteSegmento(selectedSegment.id)
    }
    setIsDeleteOpen(false)
    setSelectedSegment(null)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setSelectedSegment(null)
    setFormData(emptyForm)
    router.push("/crm/segmentos")
  }

  if (loading && segmentos.length === 0) {
    return (
      <div className="flex min-h-80 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
        Cargando segmentos...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Segmentos</h1>
          <p className="text-muted-foreground">Agrupación de clientes para campañas</p>
        </div>
        <Button onClick={openNewForm}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Segmento
        </Button>
      </div>

      {error && (
        <Card className="border-red-500/40">
          <CardContent className="pt-6 text-sm text-red-300">
            No se pudo cargar parte del padrón de segmentos: {error}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Tag className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Estáticos</p>
                <p className="text-2xl font-bold">{stats.estaticos}</p>
              </div>
              <Users className="h-8 w-8 text-slate-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Dinámicos</p>
                <p className="text-2xl font-bold text-blue-500">{stats.dinamicos}</p>
              </div>
              <Filter className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Clientes Totales</p>
                <p className="text-2xl font-bold text-emerald-500">{stats.totalClientes}</p>
              </div>
              <Users className="h-8 w-8 text-emerald-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Radar de segmentación</CardTitle>
            <CardDescription>
              Alertas visibles entre reglas, cobertura declarada y uso comercial por campañas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.title} className="rounded-lg border p-4">
                <p className="font-medium">{alert.title}</p>
                <p className="mt-2 text-sm text-muted-foreground">{alert.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Criterios más usados</CardTitle>
            <CardDescription>
              Campos más repetidos en la definición visible de segmentos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {criteriaCoverage.map(([field, total]) => (
              <div key={field} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">{segmentFieldLabels[field] ?? field}</p>
                  <p className="text-sm text-muted-foreground">{total} reglas visibles</p>
                </div>
                <Badge variant="outline">{total}</Badge>
              </div>
            ))}
            {criteriaCoverage.length === 0 && (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No hay criterios visibles para resumir.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar segmentos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(tipoLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Segmento destacado</CardTitle>
              <CardDescription>
                Grupo con mayor presión operativa visible entre campañas, criterios y cobertura.
              </CardDescription>
            </div>
            <Link href="/crm/campanas">
              <Button variant="ghost" size="sm">
                Ver campañas
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {highlightedSegment ? (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">{highlightedSegment.segment.nombre}</p>
                    <p className="text-sm text-muted-foreground">
                      {highlightedSegment.criteriaSummary}
                    </p>
                  </div>
                  <Badge className={getTipoColor(highlightedSegment.segment.tipoSegmento)}>
                    {tipoLabels[highlightedSegment.segment.tipoSegmento]}
                  </Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Cobertura declarada</p>
                    <p className="mt-2 font-medium">
                      {highlightedSegment.segment.cantidadClientes} clientes
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {highlightedSegment.visibleClients.length} visibles por criterio
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Campañas asociadas</p>
                    <p className="mt-2 font-medium">{highlightedSegment.relatedCampaigns.length}</p>
                    <p className="text-xs text-muted-foreground">
                      Presupuesto {highlightedSegment.budget.toLocaleString("es-AR")}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Megaphone className="h-4 w-4 text-primary" />
                    Campañas ligadas
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {highlightedSegment.relatedCampaigns.length > 0 ? (
                      highlightedSegment.relatedCampaigns.map((campaign) => (
                        <Badge key={campaign.id} variant="outline">
                          {campaign.nombre}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Sin campañas ligadas visibles.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No hay segmentos visibles para destacar.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Impacto comercial</CardTitle>
            <CardDescription>
              Uso de segmentos dentro del circuito de campañas visibles.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {segmentRows
              .filter((row) => row.relatedCampaigns.length > 0)
              .sort(
                (left, right) =>
                  right.relatedCampaigns.length - left.relatedCampaigns.length ||
                  right.budget - left.budget
              )
              .slice(0, 4)
              .map((row) => (
                <div key={row.segment.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{row.segment.nombre}</p>
                      <p className="text-sm text-muted-foreground">
                        {row.relatedCampaigns.length} campañas visibles
                      </p>
                    </div>
                    <Badge variant="outline">{row.segment.cantidadClientes} clientes</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Presupuesto estimado {row.budget.toLocaleString("es-AR")} · ejecutado{" "}
                    {row.spent.toLocaleString("es-AR")}
                  </p>
                </div>
              ))}
            {segmentRows.filter((row) => row.relatedCampaigns.length > 0).length === 0 && (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Ningún segmento visible aparece ligado a campañas en la carga actual.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Segmento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Criterios</TableHead>
                <TableHead>Clientes</TableHead>
                <TableHead>Campañas</TableHead>
                <TableHead>Última Actualización</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {segmentRows.map((row) => (
                <TableRow key={row.segment.id} className="group">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Tag className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{row.segment.nombre}</p>
                        {row.segment.descripcion && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {row.segment.descripcion}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getTipoColor(row.segment.tipoSegmento)}>
                      {tipoLabels[row.segment.tipoSegmento]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs text-sm text-muted-foreground">
                      {row.criteriaSummary}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {row.segment.cantidadClientes}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      {row.relatedCampaigns.length}
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(row.segment.updatedAt)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(row.segment)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(row.segment)}
                          className="text-red-500"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {segmentRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No se encontraron segmentos
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedSegment ? "Editar Segmento" : "Nuevo Segmento"}</DialogTitle>
            <DialogDescription>
              {selectedSegment ? "Modifica los datos" : "Crea un nuevo segmento de clientes"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Segmento</Label>
                <Select
                  value={formData.tipoSegmento}
                  onValueChange={(value) =>
                    setFormData({ ...formData, tipoSegmento: value as CRMSegment["tipoSegmento"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(tipoLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {formData.tipoSegmento === "estatico"
                    ? "Los clientes se agregan manualmente"
                    : "Los clientes se agregan automáticamente según criterios"}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>
                Cancelar
              </Button>
              <Button type="submit">{selectedSegment ? "Guardar" : "Crear"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar segmento?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar &quot;{selectedSegment?.nombre}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function SegmentosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Cargando...
        </div>
      }
    >
      <SegmentosContent />
    </Suspense>
  )
}

// loading.tsx
// export default function Loading() {
//   return null
// }
