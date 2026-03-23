"use client"

import { Suspense, useMemo, useState } from "react"
import Loading from "./loading"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
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
import {
  ArrowRight,
  DollarSign,
  Megaphone,
  Pencil,
  Plus,
  Search,
  Target,
  Trash2,
  TrendingUp,
  Users,
  X,
} from "lucide-react"
import Link from "next/link"
import { useCrmCampanas, useCrmSegmentos, useCrmUsuarios } from "@/lib/hooks/useCrm"
import type { CRMCampaign } from "@/lib/types"

const tipoCampanaLabels: Record<CRMCampaign["tipoCampana"], string> = {
  email: "Email Marketing",
  evento: "Evento",
  llamadas: "Llamadas",
  redes_sociales: "Redes Sociales",
  publicidad: "Publicidad",
}

const objetivoLabels: Record<CRMCampaign["objetivo"], string> = {
  generacion_leads: "Generación de leads",
  upselling: "Upselling",
  fidelizacion: "Fidelización",
  recuperacion: "Recuperación",
  branding: "Branding",
}

type CampaignStage = "planificada" | "en_curso" | "finalizada"

const stageLabels: Record<CampaignStage, string> = {
  planificada: "Planificada",
  en_curso: "En curso",
  finalizada: "Finalizada",
}

function getCampaignStage(campaign: CRMCampaign, referenceDate: Date): CampaignStage {
  const start = new Date(campaign.fechaInicio)
  start.setHours(0, 0, 0, 0)

  const end = campaign.fechaFin ? new Date(campaign.fechaFin) : null
  end?.setHours(23, 59, 59, 999)

  if (start > referenceDate) return "planificada"
  if (end && end < referenceDate) return "finalizada"
  return "en_curso"
}

function getStageBadgeVariant(stage: CampaignStage): "outline" | "secondary" | "default" {
  if (stage === "planificada") return "outline"
  if (stage === "finalizada") return "secondary"
  return "default"
}

function formatCurrency(value: number) {
  return value.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  })
}

function formatDate(value?: Date | string | null) {
  if (!value) return "Sin fecha"
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value))
}

function getConversionRate(leads: number, opportunities: number) {
  if (leads <= 0) return 0
  return (opportunities / leads) * 100
}

function getCloseRate(opportunities: number, wonDeals: number) {
  if (opportunities <= 0) return 0
  return (wonDeals / opportunities) * 100
}

function CampaignsContent() {
  const { campanas, loading, error, createCampana, updateCampana, deleteCampana } = useCrmCampanas()
  const { segmentos } = useCrmSegmentos()
  const { usuarios } = useCrmUsuarios()

  const [today] = useState(() => {
    const now = new Date()
    now.setHours(12, 0, 0, 0)
    return now
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [filterTipo, setFilterTipo] = useState<string>("todos")
  const [filterStage, setFilterStage] = useState<string>("todos")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<CRMCampaign | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    nombre: "",
    tipoCampana: "email" as CRMCampaign["tipoCampana"],
    objetivo: "generacion_leads" as CRMCampaign["objetivo"],
    segmentoObjetivoId: "",
    fechaInicio: "",
    fechaFin: "",
    presupuestoEstimado: 0,
    presupuestoGastado: 0,
    responsableId: "",
    notas: "",
    leadsGenerados: 0,
    oportunidadesGeneradas: 0,
    negociosGanados: 0,
  })

  const usersById = useMemo(() => new Map(usuarios.map((user) => [user.id, user])), [usuarios])
  const segmentsById = useMemo(
    () => new Map(segmentos.map((segment) => [segment.id, segment])),
    [segmentos]
  )

  const campaignRows = useMemo(() => {
    return campanas.map((campaign) => {
      const stage = getCampaignStage(campaign, today)
      const responsible = campaign.responsableId ? usersById.get(campaign.responsableId) : undefined
      const segment = campaign.segmentoObjetivoId
        ? segmentsById.get(campaign.segmentoObjetivoId)
        : undefined
      const budgetUsage =
        campaign.presupuestoEstimado > 0
          ? (campaign.presupuestoGastado / campaign.presupuestoEstimado) * 100
          : 0
      const conversionRate = getConversionRate(
        campaign.leadsGenerados,
        campaign.oportunidadesGeneradas
      )
      const closeRate = getCloseRate(campaign.oportunidadesGeneradas, campaign.negociosGanados)
      const score =
        (stage === "en_curso" ? 2 : stage === "planificada" ? 1 : 0) +
        (budgetUsage > 100 ? 3 : budgetUsage > 85 ? 2 : 0) +
        (campaign.oportunidadesGeneradas > 0 ? 1 : 0) +
        (campaign.negociosGanados > 0 ? 1 : 0)

      return {
        campaign,
        stage,
        responsible,
        segment,
        budgetUsage,
        conversionRate,
        closeRate,
        score,
      }
    })
  }, [campanas, segmentsById, today, usersById])

  const filteredCampaigns = useMemo(() => {
    return campaignRows.filter((row) => {
      const matchesSearch = row.campaign.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesTipo = filterTipo === "todos" || row.campaign.tipoCampana === filterTipo
      const matchesStage = filterStage === "todos" || row.stage === filterStage
      return matchesSearch && matchesTipo && matchesStage
    })
  }, [campaignRows, filterStage, filterTipo, searchTerm])

  const stats = useMemo(() => {
    return {
      activas: filteredCampaigns.filter((row) => row.stage === "en_curso").length,
      totalLeads: filteredCampaigns.reduce((sum, row) => sum + row.campaign.leadsGenerados, 0),
      totalPresupuesto: filteredCampaigns.reduce(
        (sum, row) => sum + row.campaign.presupuestoEstimado,
        0
      ),
      totalGastado: filteredCampaigns.reduce(
        (sum, row) => sum + row.campaign.presupuestoGastado,
        0
      ),
    }
  }, [filteredCampaigns])

  const alerts = useMemo(() => {
    const items: Array<{ title: string; detail: string }> = []
    const overBudget = filteredCampaigns.filter((row) => row.budgetUsage > 100).length
    const withoutSegment = filteredCampaigns.filter(
      (row) => !row.campaign.segmentoObjetivoId
    ).length
    const withoutResponsible = filteredCampaigns.filter((row) => !row.campaign.responsableId).length

    if (overBudget > 0) {
      items.push({
        title: "Presupuesto excedido",
        detail: `${overBudget} campañas visibles ya superaron el presupuesto estimado.`,
      })
    }
    if (withoutSegment > 0) {
      items.push({
        title: "Sin segmento objetivo",
        detail: `${withoutSegment} campañas no tienen segmento vinculado en el contrato actual.`,
      })
    }
    if (withoutResponsible > 0) {
      items.push({
        title: "Sin responsable asignado",
        detail: `${withoutResponsible} campañas visibles no exponen dueño comercial o marketing.`,
      })
    }
    if (!items.length) {
      items.push({
        title: "Sin alertas críticas",
        detail: "Las campañas visibles no muestran desvíos fuertes en presupuesto o asignación.",
      })
    }

    return items.slice(0, 4)
  }, [filteredCampaigns])

  const highlightedCampaign = useMemo(() => {
    const sorted = [...filteredCampaigns].sort(
      (left, right) =>
        right.score - left.score ||
        right.campaign.presupuestoEstimado - left.campaign.presupuestoEstimado
    )
    return sorted[0] ?? null
  }, [filteredCampaigns])

  const responsibleLoad = useMemo(() => {
    return usuarios
      .filter((user) => ["marketing", "administrador", "comercial"].includes(user.rol))
      .map((user) => {
        const assigned = filteredCampaigns.filter((row) => row.campaign.responsableId === user.id)
        if (!assigned.length) return null

        return {
          id: user.id,
          nombre: `${user.nombre} ${user.apellido}`,
          total: assigned.length,
          leads: assigned.reduce((sum, row) => sum + row.campaign.leadsGenerados, 0),
          active: assigned.filter((row) => row.stage === "en_curso").length,
        }
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .sort((left, right) => right.total - left.total || right.leads - left.leads)
      .slice(0, 4)
  }, [filteredCampaigns, usuarios])

  const segmentCoverage = useMemo(() => {
    return filteredCampaigns
      .filter((row) => row.segment)
      .map((row) => ({
        id: row.campaign.id,
        nombre: row.campaign.nombre,
        segmento: row.segment?.nombre ?? "Sin segmento",
        cantidadClientes: row.segment?.cantidadClientes ?? 0,
      }))
      .sort((left, right) => right.cantidadClientes - left.cantidadClientes)
      .slice(0, 4)
  }, [filteredCampaigns])

  const hasActiveFilters = filterTipo !== "todos" || filterStage !== "todos" || searchTerm !== ""

  const resetForm = () => {
    setFormData({
      nombre: "",
      tipoCampana: "email",
      objetivo: "generacion_leads",
      segmentoObjetivoId: "",
      fechaInicio: "",
      fechaFin: "",
      presupuestoEstimado: 0,
      presupuestoGastado: 0,
      responsableId: "",
      notas: "",
      leadsGenerados: 0,
      oportunidadesGeneradas: 0,
      negociosGanados: 0,
    })
    setEditingCampaign(null)
  }

  const handleEdit = (campaign: CRMCampaign) => {
    setEditingCampaign(campaign)
    setFormData({
      nombre: campaign.nombre,
      tipoCampana: campaign.tipoCampana,
      objetivo: campaign.objetivo,
      segmentoObjetivoId: campaign.segmentoObjetivoId || "",
      fechaInicio: new Date(campaign.fechaInicio).toISOString().split("T")[0],
      fechaFin: campaign.fechaFin ? new Date(campaign.fechaFin).toISOString().split("T")[0] : "",
      presupuestoEstimado: campaign.presupuestoEstimado,
      presupuestoGastado: campaign.presupuestoGastado,
      responsableId: campaign.responsableId || "",
      notas: campaign.notas || "",
      leadsGenerados: campaign.leadsGenerados,
      oportunidadesGeneradas: campaign.oportunidadesGeneradas,
      negociosGanados: campaign.negociosGanados,
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    const payload = {
      ...formData,
      segmentoObjetivoId: formData.segmentoObjetivoId || undefined,
      responsableId: formData.responsableId || undefined,
      fechaInicio: new Date(formData.fechaInicio),
      fechaFin: formData.fechaFin ? new Date(formData.fechaFin) : undefined,
    }

    if (editingCampaign) {
      await updateCampana(editingCampaign.id, payload)
    } else {
      await createCampana(payload as Omit<CRMCampaign, "id" | "createdAt" | "updatedAt">)
    }

    setIsDialogOpen(false)
    resetForm()
  }

  const handleDelete = async () => {
    if (deleteId) {
      await deleteCampana(deleteId)
      setDeleteId(null)
    }
  }

  const clearFilters = () => {
    setSearchTerm("")
    setFilterTipo("todos")
    setFilterStage("todos")
  }

  if (loading && campanas.length === 0) {
    return <Loading />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Campañas</h1>
          <p className="text-muted-foreground">
            Consola de marketing con vigencia, presión presupuestaria y resultados visibles por
            campaña.
          </p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) resetForm()
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Campaña
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCampaign ? "Editar Campaña" : "Nueva Campaña"}</DialogTitle>
              <DialogDescription>
                La vigencia se deriva de fecha inicio y fin; no se persiste un estado artificial
                fuera del contrato.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">Información general</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="nombre">Nombre de la campaña *</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="tipoCampana">Tipo de campaña</Label>
                    <Select
                      value={formData.tipoCampana}
                      onValueChange={(v) =>
                        setFormData({ ...formData, tipoCampana: v as CRMCampaign["tipoCampana"] })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(tipoCampanaLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="objetivo">Objetivo</Label>
                    <Select
                      value={formData.objetivo}
                      onValueChange={(v) =>
                        setFormData({ ...formData, objetivo: v as CRMCampaign["objetivo"] })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(objetivoLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">Fechas y presupuesto</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fechaInicio">Fecha inicio *</Label>
                    <Input
                      id="fechaInicio"
                      type="date"
                      value={formData.fechaInicio}
                      onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="fechaFin">Fecha fin</Label>
                    <Input
                      id="fechaFin"
                      type="date"
                      value={formData.fechaFin}
                      onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="presupuestoEstimado">Presupuesto estimado</Label>
                    <Input
                      id="presupuestoEstimado"
                      type="number"
                      value={formData.presupuestoEstimado}
                      onChange={(e) =>
                        setFormData({ ...formData, presupuestoEstimado: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="presupuestoGastado">Presupuesto gastado</Label>
                    <Input
                      id="presupuestoGastado"
                      type="number"
                      value={formData.presupuestoGastado}
                      onChange={(e) =>
                        setFormData({ ...formData, presupuestoGastado: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">Asignación</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="segmentoObjetivoId">Segmento objetivo</Label>
                    <Select
                      value={formData.segmentoObjetivoId || "__none__"}
                      onValueChange={(v) =>
                        setFormData({ ...formData, segmentoObjetivoId: v === "__none__" ? "" : v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar segmento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sin segmento</SelectItem>
                        {segmentos.map((segment) => (
                          <SelectItem key={segment.id} value={segment.id}>
                            {segment.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="responsableId">Responsable</Label>
                    <Select
                      value={formData.responsableId || "__none__"}
                      onValueChange={(v) =>
                        setFormData({ ...formData, responsableId: v === "__none__" ? "" : v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar responsable" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sin responsable</SelectItem>
                        {usuarios.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.nombre} {user.apellido}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {editingCampaign && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground">Resultados visibles</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="leadsGenerados">Leads generados</Label>
                      <Input
                        id="leadsGenerados"
                        type="number"
                        value={formData.leadsGenerados}
                        onChange={(e) =>
                          setFormData({ ...formData, leadsGenerados: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="oportunidadesGeneradas">Oportunidades</Label>
                      <Input
                        id="oportunidadesGeneradas"
                        type="number"
                        value={formData.oportunidadesGeneradas}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            oportunidadesGeneradas: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="negociosGanados">Negocios ganados</Label>
                      <Input
                        id="negociosGanados"
                        type="number"
                        value={formData.negociosGanados}
                        onChange={(e) =>
                          setFormData({ ...formData, negociosGanados: Number(e.target.value) })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="notas">Notas</Label>
                <Textarea
                  id="notas"
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false)
                  resetForm()
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={!formData.nombre || !formData.fechaInicio}>
                {editingCampaign ? "Guardar cambios" : "Crear campaña"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Card className="border-red-500/40">
          <CardContent className="pt-6 text-sm text-red-300">
            No se pudo cargar parte del panel de campañas: {error}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campañas en curso</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activas}</div>
            <p className="text-xs text-muted-foreground">de {filteredCampaigns.length} visibles</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads generados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLeads}</div>
            <p className="text-xs text-muted-foreground">acumulado sobre campañas filtradas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Presupuesto total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalPresupuesto)}</div>
            <p className="text-xs text-muted-foreground">estimado para campañas visibles</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Presupuesto ejecutado</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalGastado)}</div>
            <Progress
              value={
                stats.totalPresupuesto > 0 ? (stats.totalGastado / stats.totalPresupuesto) * 100 : 0
              }
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Radar de campañas</CardTitle>
            <CardDescription>
              Alertas visibles de presupuesto, segmentación y asignación sobre la cartera filtrada.
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
            <CardTitle>Responsables con carga</CardTitle>
            <CardDescription>
              Distribución visible de campañas entre marketing y comerciales asignados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {responsibleLoad.map((row) => (
              <div key={row.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{row.nombre}</p>
                    <p className="text-sm text-muted-foreground">{row.total} campañas visibles</p>
                  </div>
                  <Badge variant={row.active > 0 ? "default" : "outline"}>
                    {row.active} activas
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {row.leads} leads acumulados visibles.
                </p>
              </div>
            ))}
            {responsibleLoad.length === 0 && (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No hay responsables con campañas visibles en los filtros actuales.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Campaña destacada</CardTitle>
              <CardDescription>
                Iniciativa con mayor presión visible entre vigencia, presupuesto y resultados.
              </CardDescription>
            </div>
            {highlightedCampaign?.segment && (
              <Link href="/crm/segmentos">
                <Button variant="ghost" size="sm">
                  Ver segmentos
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {highlightedCampaign ? (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">{highlightedCampaign.campaign.nombre}</p>
                    <p className="text-sm text-muted-foreground">
                      {tipoCampanaLabels[highlightedCampaign.campaign.tipoCampana]} ·{" "}
                      {objetivoLabels[highlightedCampaign.campaign.objetivo]}
                    </p>
                  </div>
                  <Badge variant={getStageBadgeVariant(highlightedCampaign.stage)}>
                    {stageLabels[highlightedCampaign.stage]}
                  </Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Segmento objetivo</p>
                    <p className="mt-2 font-medium">
                      {highlightedCampaign.segment?.nombre ?? "Sin segmento vinculado"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {highlightedCampaign.segment
                        ? `${highlightedCampaign.segment.cantidadClientes} clientes visibles`
                        : "El contrato actual no liga cobertura a otro padrón"}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Responsable</p>
                    <p className="mt-2 font-medium">
                      {highlightedCampaign.responsible
                        ? `${highlightedCampaign.responsible.nombre} ${highlightedCampaign.responsible.apellido}`
                        : "Sin responsable asignado"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Vigencia {formatDate(highlightedCampaign.campaign.fechaInicio)} -{" "}
                      {formatDate(highlightedCampaign.campaign.fechaFin)}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Target className="h-4 w-4 text-primary" />
                    Resultados visibles
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Leads</p>
                      <p className="font-medium">{highlightedCampaign.campaign.leadsGenerados}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Conversión</p>
                      <p className="font-medium">
                        {highlightedCampaign.conversionRate.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Cierre</p>
                      <p className="font-medium">{highlightedCampaign.closeRate.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No hay campañas visibles para destacar.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cobertura por segmento</CardTitle>
            <CardDescription>
              Relación visible entre campañas y tamaño declarado del segmento objetivo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {segmentCoverage.map((row) => (
              <div key={row.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{row.nombre}</p>
                    <p className="text-sm text-muted-foreground">{row.segmento}</p>
                  </div>
                  <Badge variant="outline">{row.cantidadClientes} clientes</Badge>
                </div>
              </div>
            ))}
            {segmentCoverage.length === 0 && (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Ninguna campaña visible está ligada a un segmento objetivo.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Lista de campañas</CardTitle>
              <CardDescription>{filteredCampaigns.length} campañas encontradas</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar campaña..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-50 pl-8"
                />
              </div>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="w-37.5">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los tipos</SelectItem>
                  {Object.entries(tipoCampanaLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStage} onValueChange={setFilterStage}>
                <SelectTrigger className="w-37.5">
                  <SelectValue placeholder="Vigencia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="planificada">Planificadas</SelectItem>
                  <SelectItem value="en_curso">En curso</SelectItem>
                  <SelectItem value="finalizada">Finalizadas</SelectItem>
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-1 h-4 w-4" />
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Objetivo</TableHead>
                <TableHead>Vigencia</TableHead>
                <TableHead>Presupuesto</TableHead>
                <TableHead>Resultados</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCampaigns.map((row) => (
                <TableRow key={row.campaign.id} className="group">
                  <TableCell className="font-medium">{row.campaign.nombre}</TableCell>
                  <TableCell>{tipoCampanaLabels[row.campaign.tipoCampana]}</TableCell>
                  <TableCell>{objetivoLabels[row.campaign.objetivo]}</TableCell>
                  <TableCell>
                    <Badge variant={getStageBadgeVariant(row.stage)}>
                      {stageLabels[row.stage]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatCurrency(row.campaign.presupuestoGastado)} /{" "}
                      {formatCurrency(row.campaign.presupuestoEstimado)}
                    </div>
                    <Progress value={row.budgetUsage} className="mt-1 h-1" />
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{row.campaign.leadsGenerados} leads</p>
                      <p className="text-xs text-muted-foreground">
                        {row.conversionRate.toFixed(1)}% a oportunidad
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {row.responsible
                      ? `${row.responsible.nombre} ${row.responsible.apellido}`
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(row.campaign)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(row.campaign.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredCampaigns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No se encontraron campañas
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar campaña</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la campaña visible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function CampanasPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CampaignsContent />
    </Suspense>
  )
}
