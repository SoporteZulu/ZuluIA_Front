"use client"

import React, { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  Filter,
  Megaphone,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Tag,
  Target,
  Trash2,
  Users,
  X,
} from "lucide-react"
import { CrmPageHero, CrmStatCard, crmPanelClassName } from "@/components/crm/crm-page-kit"

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { useCrmCampanas, useCrmClientes, useCrmSegmentos } from "@/lib/hooks/useCrm"
import type { CRMSegment, CrmSegmentoMiembro, SegmentCriteria } from "@/lib/types"

const tipoLabels: Record<CRMSegment["tipoSegmento"], string> = {
  estatico: "Estático",
  dinamico: "Dinámico",
}

const segmentFieldLabels: Record<string, string> = {
  segmento: "Segmento",
  tipoCliente: "Tipo de cliente",
  industria: "Industria",
  estadoRelacion: "Estado de relación",
  origenCliente: "Origen",
  pais: "País",
  provincia: "Provincia",
  ciudad: "Ciudad",
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
  campana: "Campaña",
  referido: "Referido",
  web: "Web",
  llamada: "Llamada",
  evento: "Evento",
}

const operatorLabels: Record<SegmentCriteria["operador"], string> = {
  igual: "igual a",
  contiene: "contiene",
  mayor_que: "mayor que",
  menor_que: "menor que",
  entre: "entre",
}

type SegmentFormState = {
  nombre: string
  descripcion: string
  tipoSegmento: CRMSegment["tipoSegmento"]
  criterios: SegmentCriteria[]
}

function createEmptyCriterion(): SegmentCriteria {
  return {
    campo: "segmento",
    operador: "igual",
    valor: "pyme",
  }
}

function createEmptyForm(): SegmentFormState {
  return {
    nombre: "",
    descripcion: "",
    tipoSegmento: "estatico",
    criterios: [],
  }
}

function getCriterionSummary(criteria: SegmentCriteria[]) {
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

function formatDate(date?: Date | string) {
  if (!date) return "-"
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date))
}

function getTipoColor(tipo: CRMSegment["tipoSegmento"]) {
  return tipo === "estatico" ? "bg-slate-500/20 text-slate-300" : "bg-blue-500/20 text-blue-300"
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
  const [formData, setFormData] = useState<SegmentFormState>(createEmptyForm())
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewMembers, setPreviewMembers] = useState<CrmSegmentoMiembro[]>([])
  const [previewCount, setPreviewCount] = useState(0)
  const [membersLoading, setMembersLoading] = useState(false)
  const [segmentMembers, setSegmentMembers] = useState<CrmSegmentoMiembro[]>([])
  const [memberToAdd, setMemberToAdd] = useState("none")

  const {
    segmentos,
    loading,
    error,
    createSegmento,
    updateSegmento,
    deleteSegmento,
    getMiembros,
    addMiembro,
    removeMiembro,
    previewSegmento,
  } = useCrmSegmentos()
  const { campanas } = useCrmCampanas()
  const { clientes } = useCrmClientes()

  const filteredSegments = useMemo(() => {
    return segmentos.filter((segment) => {
      const matchesSearch =
        segment.nombre.toLowerCase().includes(search.toLowerCase()) ||
        segment.descripcion?.toLowerCase().includes(search.toLowerCase())
      const matchesTipo = filterTipo === "all" || segment.tipoSegmento === filterTipo
      return matchesSearch && matchesTipo
    })
  }, [filterTipo, search, segmentos])

  const segmentRows = useMemo(() => {
    return filteredSegments.map((segment) => {
      const relatedCampaigns = campanas.filter(
        (campaign) => campaign.segmentoObjetivoId === segment.id
      )
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
        (segment.tipoSegmento === "dinamico" ? segment.criterios.length : 0) +
        (segment.cantidadClientes === 0 ? 2 : 0)

      return {
        segment,
        relatedCampaigns,
        budget,
        spent,
        score,
        criteriaSummary: getCriterionSummary(segment.criterios),
      }
    })
  }, [campanas, filteredSegments])

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
    const withoutCriteria = segmentRows.filter(
      (row) => row.segment.tipoSegmento === "dinamico" && row.segment.criterios.length === 0
    ).length
    const withoutClients = segmentRows.filter((row) => row.segment.cantidadClientes === 0).length
    const withCampaigns = segmentRows.filter((row) => row.relatedCampaigns.length > 0).length

    if (withoutCriteria > 0) {
      items.push({
        title: "Segmentos dinámicos incompletos",
        detail: `${withoutCriteria} segmentos dinámicos no tienen criterios cargados.`,
      })
    }

    if (withoutClients > 0) {
      items.push({
        title: "Cobertura vacía",
        detail: `${withoutClients} segmentos visibles hoy no contienen clientes.`,
      })
    }

    if (withCampaigns > 0) {
      items.push({
        title: "Uso comercial activo",
        detail: `${withCampaigns} segmentos visibles están ligados a campañas del módulo CRM.`,
      })
    }

    if (!items.length) {
      items.push({
        title: "Sin alertas críticas",
        detail: "La segmentación visible no muestra desvíos operativos relevantes.",
      })
    }

    return items.slice(0, 4)
  }, [segmentRows])

  const criteriaCoverage = useMemo(() => {
    return Object.entries(
      segmentRows.reduce<Record<string, number>>((accumulator, row) => {
        row.segment.criterios.forEach((criterion) => {
          accumulator[criterion.campo] = (accumulator[criterion.campo] ?? 0) + 1
        })
        return accumulator
      }, {})
    )
      .sort((left, right) => right[1] - left[1])
      .slice(0, 4)
  }, [segmentRows])

  const highlightedSegment = useMemo(() => {
    const sorted = [...segmentRows].sort(
      (left, right) =>
        right.score - left.score ||
        right.relatedCampaigns.length - left.relatedCampaigns.length ||
        right.segment.cantidadClientes - left.segment.cantidadClientes
    )
    return sorted[0] ?? null
  }, [segmentRows])

  const availableClientsToAdd = useMemo(() => {
    const memberIds = new Set(segmentMembers.map((member) => member.id))
    return clientes.filter((client) => !memberIds.has(client.id))
  }, [clientes, segmentMembers])

  useEffect(() => {
    if (!isFormOpen) return
    if (formData.tipoSegmento !== "dinamico") {
      setPreviewMembers([])
      setPreviewCount(0)
      setPreviewLoading(false)
      return
    }

    let cancelled = false

    const runPreview = async () => {
      setPreviewLoading(true)
      try {
        const preview = await previewSegmento(formData.criterios, formData.tipoSegmento)
        if (cancelled) return
        setPreviewCount(preview.cantidadClientes)
        setPreviewMembers(preview.clientes)
      } catch {
        if (cancelled) return
        setPreviewCount(0)
        setPreviewMembers([])
      } finally {
        if (!cancelled) setPreviewLoading(false)
      }
    }

    void runPreview()

    return () => {
      cancelled = true
    }
  }, [formData.criterios, formData.tipoSegmento, isFormOpen, previewSegmento])

  useEffect(() => {
    if (!isFormOpen || !selectedSegment || formData.tipoSegmento !== "estatico") {
      setSegmentMembers([])
      setMembersLoading(false)
      return
    }

    let cancelled = false

    const loadMembers = async () => {
      setMembersLoading(true)
      try {
        const members = await getMiembros(selectedSegment.id)
        if (!cancelled) setSegmentMembers(members)
      } catch {
        if (!cancelled) setSegmentMembers([])
      } finally {
        if (!cancelled) setMembersLoading(false)
      }
    }

    void loadMembers()

    return () => {
      cancelled = true
    }
  }, [formData.tipoSegmento, getMiembros, isFormOpen, selectedSegment])

  const openNewForm = () => {
    setSelectedSegment(null)
    setFormError(null)
    setFormData(createEmptyForm())
    setPreviewCount(0)
    setPreviewMembers([])
    setSegmentMembers([])
    setMemberToAdd("none")
    setIsFormOpen(true)
  }

  const handleEdit = (segment: CRMSegment) => {
    setSelectedSegment(segment)
    setFormError(null)
    setFormData({
      nombre: segment.nombre,
      descripcion: segment.descripcion ?? "",
      tipoSegmento: segment.tipoSegmento,
      criterios: segment.criterios.length > 0 ? segment.criterios : [],
    })
    setIsFormOpen(true)
  }

  const handleDelete = (segment: CRMSegment) => {
    setSelectedSegment(segment)
    setIsDeleteOpen(true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setSelectedSegment(null)
    setFormError(null)
    setFormData(createEmptyForm())
    setPreviewCount(0)
    setPreviewMembers([])
    setSegmentMembers([])
    setMemberToAdd("none")
    router.push("/crm/segmentos")
  }

  const updateCriterion = (index: number, patch: Partial<SegmentCriteria>) => {
    setFormData((current) => ({
      ...current,
      criterios: current.criterios.map((criterion, criterionIndex) =>
        criterionIndex === index ? { ...criterion, ...patch } : criterion
      ),
    }))
  }

  const addCriterion = () => {
    setFormData((current) => ({
      ...current,
      criterios: [...current.criterios, createEmptyCriterion()],
    }))
  }

  const removeCriterion = (index: number) => {
    setFormData((current) => ({
      ...current,
      criterios: current.criterios.filter((_, criterionIndex) => criterionIndex !== index),
    }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!formData.nombre.trim()) {
      setFormError("El nombre del segmento es obligatorio.")
      return
    }

    if (formData.tipoSegmento === "dinamico") {
      const invalidCriterion = formData.criterios.find(
        (criterion) =>
          !criterion.campo || !criterion.operador || `${criterion.valor ?? ""}`.trim() === ""
      )
      if (invalidCriterion) {
        setFormError("Todos los criterios dinámicos deben tener campo, operador y valor.")
        return
      }
    }

    setSaving(true)
    setFormError(null)

    const payload = {
      nombre: formData.nombre.trim(),
      descripcion: formData.descripcion.trim() || undefined,
      tipoSegmento: formData.tipoSegmento,
      criterios: formData.tipoSegmento === "dinamico" ? formData.criterios : [],
      cantidadClientes: 0,
    }

    try {
      if (selectedSegment) {
        await updateSegmento(selectedSegment.id, payload)
      } else {
        await createSegmento(payload)
      }
      closeForm()
    } catch (submissionError) {
      setFormError(
        submissionError instanceof Error
          ? submissionError.message
          : "No se pudo guardar el segmento CRM."
      )
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!selectedSegment) return
    await deleteSegmento(selectedSegment.id)
    setIsDeleteOpen(false)
    setSelectedSegment(null)
  }

  const handleAddMember = async () => {
    if (!selectedSegment || memberToAdd === "none") return
    const updatedMembers = await addMiembro(selectedSegment.id, memberToAdd)
    setSegmentMembers(updatedMembers)
    setMemberToAdd("none")
  }

  const handleRemoveMember = async (clienteId: string) => {
    if (!selectedSegment) return
    await removeMiembro(selectedSegment.id, clienteId)
    setSegmentMembers((current) => current.filter((member) => member.id !== clienteId))
  }

  if (loading && segmentos.length === 0) {
    return (
      <div className="flex min-h-80 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
        Cargando segmentos CRM...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <CrmPageHero
        eyebrow="CRM audiencias"
        title="Segmentos"
        description="Definición de audiencias CRM con preview dinámico, criterios reutilizables y lectura rápida de impacto comercial."
        actions={
          <Button onClick={openNewForm}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Segmento
          </Button>
        }
      />

      {error && (
        <Card className="border-red-500/40">
          <CardContent className="pt-6 text-sm text-red-300">{error}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <CrmStatCard
          label="Total"
          value={stats.total}
          hint="Segmentos visibles en la operación CRM"
          icon={Tag}
          tone="slate"
        />
        <CrmStatCard
          label="Estáticos"
          value={stats.estaticos}
          hint="Audiencias administradas por miembros fijos"
          icon={Users}
          tone="violet"
        />
        <CrmStatCard
          label="Dinámicos"
          value={stats.dinamicos}
          hint="Segmentos guiados por reglas y criterios"
          icon={Filter}
          tone="blue"
        />
        <CrmStatCard
          label="Cobertura total"
          value={stats.totalClientes}
          hint="Clientes alcanzados por la segmentación actual"
          icon={Target}
          tone="emerald"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card className={crmPanelClassName}>
          <CardHeader>
            <CardTitle>Radar de segmentación</CardTitle>
            <CardDescription>
              Alertas visibles entre cobertura, definición y uso comercial de los segmentos CRM.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.title}
                className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
              >
                <p className="font-medium">{alert.title}</p>
                <p className="mt-2 text-sm text-muted-foreground">{alert.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className={crmPanelClassName}>
          <CardHeader>
            <CardTitle>Criterios más usados</CardTitle>
            <CardDescription>
              Campos más repetidos en las reglas de segmentos dinámicos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {criteriaCoverage.map(([field, total]) => (
              <div
                key={field}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div>
                  <p className="font-medium">{segmentFieldLabels[field] ?? field}</p>
                  <p className="text-sm text-muted-foreground">{total} reglas visibles</p>
                </div>
                <Badge variant="outline">{total}</Badge>
              </div>
            ))}
            {criteriaCoverage.length === 0 && (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No hay criterios dinámicos cargados para resumir.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className={crmPanelClassName}>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar segmentos..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-full md:w-44">
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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card className={crmPanelClassName}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Segmento destacado</CardTitle>
              <CardDescription>
                Mayor presión visible entre uso comercial y volumen de clientes alcanzados.
              </CardDescription>
            </div>
            <Link href="/crm/campanas">
              <Button variant="ghost" size="sm">
                Ver campañas
                <Target className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {highlightedSegment ? (
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
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
                  <div className="rounded-xl border border-slate-200 bg-white/90 p-3">
                    <p className="text-sm text-muted-foreground">Clientes alcanzados</p>
                    <p className="mt-2 font-medium">
                      {highlightedSegment.segment.cantidadClientes}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white/90 p-3">
                    <p className="text-sm text-muted-foreground">Campañas asociadas</p>
                    <p className="mt-2 font-medium">{highlightedSegment.relatedCampaigns.length}</p>
                    <p className="text-xs text-muted-foreground">
                      Presupuesto {highlightedSegment.budget.toLocaleString("es-AR")}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white/90 p-3">
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

        <Card className={crmPanelClassName}>
          <CardHeader>
            <CardTitle>Impacto comercial</CardTitle>
            <CardDescription>
              Uso de segmentos dentro del circuito de campañas visibles.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {segmentRows
              .filter((row) => row.relatedCampaigns.length > 0)
              .sort((left, right) => right.relatedCampaigns.length - left.relatedCampaigns.length)
              .slice(0, 4)
              .map((row) => (
                <div
                  key={row.segment.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
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

      <Card className={crmPanelClassName}>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Segmento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Criterios</TableHead>
                <TableHead>Clientes</TableHead>
                <TableHead>Campañas</TableHead>
                <TableHead>Actualización</TableHead>
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
                          <p className="line-clamp-1 text-sm text-muted-foreground">
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
                  <TableCell>{row.segment.cantidadClientes}</TableCell>
                  <TableCell>{row.relatedCampaigns.length}</TableCell>
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
                          className="text-red-400"
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
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No se encontraron segmentos.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSegment ? "Editar Segmento" : "Nuevo Segmento"}</DialogTitle>
            <DialogDescription>
              Los segmentos dinámicos usan preview backend; los estáticos administran miembros
              reales del CRM.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Nombre *</Label>
                <Input
                  value={formData.nombre}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, nombre: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Descripción</Label>
                <Textarea
                  rows={3}
                  value={formData.descripcion}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, descripcion: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de segmento</Label>
                <Select
                  value={formData.tipoSegmento}
                  onValueChange={(value) =>
                    setFormData((current) => ({
                      ...current,
                      tipoSegmento: value as CRMSegment["tipoSegmento"],
                      criterios: value === "dinamico" ? current.criterios : [],
                    }))
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
              </div>
            </div>

            {formData.tipoSegmento === "dinamico" ? (
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Reglas del segmento</CardTitle>
                      <CardDescription>
                        Cada cambio recalcula el preview usando el servicio CRM del backend.
                      </CardDescription>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addCriterion}>
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar regla
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {formData.criterios.map((criterion, index) => (
                      <div key={`${criterion.campo}-${index}`} className="rounded-lg border p-4">
                        <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                          <Select
                            value={criterion.campo}
                            onValueChange={(value) => updateCriterion(index, { campo: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(segmentFieldLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Select
                            value={criterion.operador}
                            onValueChange={(value) =>
                              updateCriterion(index, {
                                operador: value as SegmentCriteria["operador"],
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(operatorLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Input
                            value={String(criterion.valor ?? "")}
                            onChange={(event) =>
                              updateCriterion(index, { valor: event.target.value })
                            }
                            placeholder="Valor"
                          />

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeCriterion(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {formData.criterios.length === 0 && (
                      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                        Agregá al menos una regla para definir el segmento dinámico.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Preview</CardTitle>
                    <CardDescription>
                      Estimación backend de clientes alcanzados con las reglas actuales.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground">Clientes estimados</p>
                      <p className="mt-2 text-3xl font-bold">
                        {previewLoading ? "..." : previewCount}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {previewMembers.slice(0, 6).map((member) => (
                        <div key={member.id} className="rounded-lg border p-3">
                          <p className="font-medium">{member.nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {segmentValueLabels[member.segmento] ?? member.segmento} ·{" "}
                            {member.ciudad ?? member.pais}
                          </p>
                        </div>
                      ))}
                      {!previewLoading && previewMembers.length === 0 && (
                        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                          No hay clientes alcanzados con las reglas cargadas.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Miembros del segmento</CardTitle>
                  <CardDescription>
                    En segmentos estáticos la membresía se mantiene manualmente contra el backend
                    CRM.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedSegment ? (
                    <>
                      <div className="flex flex-col gap-3 md:flex-row">
                        <Select value={memberToAdd} onValueChange={setMemberToAdd}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Agregar cliente" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Seleccionar cliente</SelectItem>
                            {availableClientsToAdd.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          onClick={() => void handleAddMember()}
                          disabled={memberToAdd === "none"}
                        >
                          Agregar miembro
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {membersLoading ? (
                          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                            Cargando miembros...
                          </div>
                        ) : segmentMembers.length > 0 ? (
                          segmentMembers.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between rounded-lg border p-3"
                            >
                              <div>
                                <p className="font-medium">{member.nombre}</p>
                                <p className="text-xs text-muted-foreground">
                                  {segmentValueLabels[member.tipoCliente] ?? member.tipoCliente} ·{" "}
                                  {member.ciudad ?? member.pais}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => void handleRemoveMember(member.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-400" />
                              </Button>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                            Este segmento todavía no tiene miembros cargados.
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      Guardá el segmento por primera vez y luego podrás administrar miembros
                      estáticos.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {formError && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                {formError}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando..." : selectedSegment ? "Guardar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar segmento?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar “{selectedSegment?.nombre}”.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDelete()}
              className="bg-red-500 hover:bg-red-600"
            >
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
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          Cargando...
        </div>
      }
    >
      <SegmentosContent />
    </Suspense>
  )
}
