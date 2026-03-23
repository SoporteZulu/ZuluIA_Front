"use client"

import { useMemo, useState } from "react"
import {
  AlertCircle,
  BarChart3,
  Eye,
  FileCheck2,
  GanttChartSquare,
  Landmark,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
} from "lucide-react"

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useEntidades, useObras, useProcedimientos } from "@/lib/hooks/useProyectos"
import type { Entidad, Obra, Procedimiento } from "@/lib/proyectos-types"

type ActiveTab = "obras" | "procedimientos" | "entidades"

type EntidadFormState = {
  nombre: string
  tipo: Entidad["tipo"]
  cuitCuil: string
  direccion: string
  telefono: string
  email: string
  personaContacto: string
  cargoContacto: string
  estado: Entidad["estado"]
  notas: string
}

type ObraFormState = {
  nombre: string
  descripcion: string
  procedimientoAsociado: string
  entidadEjecutora: string
  contratista: string
  inspector: string
  ubicacion: string
  fechaInicio: string
  fechaFinPrevista: string
  fechaFinReal: string
  presupuestoOficial: string
  montoEjecutado: string
  avanceFisico: string
  avanceFinanciero: string
  estado: Obra["estado"]
  certificadosEmitidos: string
  redeterminaciones: string
  ampliaciones: string
  observaciones: string
}

const ENTIDAD_TIPOS: Entidad["tipo"][] = ["Público", "Privado", "Mixto"]
const ENTIDAD_ESTADOS: Entidad["estado"][] = ["Activo", "Inactivo", "Suspendido"]
const OBRA_ESTADOS: Obra["estado"][] = [
  "No Iniciada",
  "En Ejecución",
  "Paralizada",
  "Finalizada",
  "En Garantía",
]

const emptyEntidadForm = (): EntidadFormState => ({
  nombre: "",
  tipo: "Público",
  cuitCuil: "",
  direccion: "",
  telefono: "",
  email: "",
  personaContacto: "",
  cargoContacto: "",
  estado: "Activo",
  notas: "",
})

const emptyObraForm = (): ObraFormState => ({
  nombre: "",
  descripcion: "",
  procedimientoAsociado: "",
  entidadEjecutora: "",
  contratista: "",
  inspector: "",
  ubicacion: "",
  fechaInicio: "",
  fechaFinPrevista: "",
  fechaFinReal: "",
  presupuestoOficial: "0",
  montoEjecutado: "0",
  avanceFisico: "0",
  avanceFinanciero: "0",
  estado: "No Iniciada",
  certificadosEmitidos: "0",
  redeterminaciones: "0",
  ampliaciones: "",
  observaciones: "",
})

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0))
}

function formatDate(value?: Date | string) {
  if (!value) return "-"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"

  return date.toLocaleDateString("es-AR")
}

function toInputDate(value?: Date | string) {
  if (!value) return ""

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  return date.toISOString().slice(0, 10)
}

function getDaysToDate(value: Date | string | undefined, referenceDate: Date) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  const base = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  )
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.round((target.getTime() - base.getTime()) / 86400000)
}

function getEntidadVariant(
  estado: Entidad["estado"]
): "default" | "secondary" | "outline" | "destructive" {
  switch (estado) {
    case "Activo":
      return "default"
    case "Inactivo":
      return "secondary"
    case "Suspendido":
      return "destructive"
    default:
      return "outline"
  }
}

function getObraVariant(
  estado: Obra["estado"]
): "default" | "secondary" | "outline" | "destructive" {
  switch (estado) {
    case "En Ejecución":
      return "default"
    case "Finalizada":
    case "En Garantía":
      return "secondary"
    case "Paralizada":
      return "destructive"
    case "No Iniciada":
    default:
      return "outline"
  }
}

function getProcedimientoVariant(
  estado: Procedimiento["estado"]
): "default" | "secondary" | "outline" | "destructive" {
  switch (estado) {
    case "Publicado":
    case "En Evaluación":
      return "default"
    case "Adjudicado":
      return "secondary"
    case "Cancelado":
      return "destructive"
    case "En Preparación":
    default:
      return "outline"
  }
}

function buildEntidadForm(entidad: Entidad): EntidadFormState {
  return {
    nombre: entidad.nombre,
    tipo: entidad.tipo,
    cuitCuil: entidad.cuitCuil,
    direccion: entidad.direccion,
    telefono: entidad.telefono,
    email: entidad.email,
    personaContacto: entidad.personaContacto,
    cargoContacto: entidad.cargoContacto,
    estado: entidad.estado,
    notas: entidad.notas ?? "",
  }
}

function buildObraForm(obra: Obra): ObraFormState {
  return {
    nombre: obra.nombre,
    descripcion: obra.descripcion,
    procedimientoAsociado: obra.procedimientoAsociado,
    entidadEjecutora: obra.entidadEjecutora,
    contratista: obra.contratista,
    inspector: obra.inspector,
    ubicacion: obra.ubicacion,
    fechaInicio: toInputDate(obra.fechaInicio),
    fechaFinPrevista: toInputDate(obra.fechaFinPrevista),
    fechaFinReal: toInputDate(obra.fechaFinReal),
    presupuestoOficial: String(obra.presupuestoOficial ?? 0),
    montoEjecutado: String(obra.montoEjecutado ?? 0),
    avanceFisico: String(obra.avanceFisico ?? 0),
    avanceFinanciero: String(obra.avanceFinanciero ?? 0),
    estado: obra.estado,
    certificadosEmitidos: String(obra.certificadosEmitidos ?? 0),
    redeterminaciones: String(obra.redeterminaciones ?? 0),
    ampliaciones: obra.ampliaciones,
    observaciones: obra.observaciones ?? "",
  }
}

function SummaryCard({
  title,
  value,
  description,
  icon,
}: {
  title: string
  value: string | number
  description: string
  icon: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

export default function ObrasPage() {
  const [today] = useState(() => new Date())
  const [activeTab, setActiveTab] = useState<ActiveTab>("obras")
  const [searchTerm, setSearchTerm] = useState("")

  const {
    entidades,
    loading: loadingEntidades,
    error: errorEntidades,
    createEntidad,
    updateEntidad,
    deleteEntidad,
    refetch: refetchEntidades,
  } = useEntidades()
  const {
    procedimientos,
    loading: loadingProcedimientos,
    error: errorProcedimientos,
    refetch: refetchProcedimientos,
  } = useProcedimientos()
  const {
    obras,
    loading: loadingObras,
    error: errorObras,
    createObra,
    updateObra,
    deleteObra,
    refetch: refetchObras,
  } = useObras()

  const [selectedObra, setSelectedObra] = useState<Obra | null>(null)
  const [detailObraOpen, setDetailObraOpen] = useState(false)

  const [entidadFormOpen, setEntidadFormOpen] = useState(false)
  const [editingEntidad, setEditingEntidad] = useState<Entidad | null>(null)
  const [entidadForm, setEntidadForm] = useState<EntidadFormState>(emptyEntidadForm)
  const [entidadSaving, setEntidadSaving] = useState(false)
  const [entidadError, setEntidadError] = useState<string | null>(null)

  const [obraFormOpen, setObraFormOpen] = useState(false)
  const [editingObra, setEditingObra] = useState<Obra | null>(null)
  const [obraForm, setObraForm] = useState<ObraFormState>(emptyObraForm)
  const [obraSaving, setObraSaving] = useState(false)
  const [obraError, setObraError] = useState<string | null>(null)

  const loading = loadingEntidades || loadingProcedimientos || loadingObras
  const error = errorEntidades ?? errorProcedimientos ?? errorObras ?? entidadError ?? obraError
  const term = searchTerm.trim().toLowerCase()

  const entidadesFiltradas = useMemo(() => {
    return entidades.filter((entidad) => {
      return [entidad.nombre, entidad.tipo, entidad.email, entidad.personaContacto, entidad.estado]
        .join(" ")
        .toLowerCase()
        .includes(term)
    })
  }, [entidades, term])

  const procedimientosFiltrados = useMemo(() => {
    return procedimientos.filter((procedimiento) => {
      return [
        procedimiento.numeroExpediente,
        procedimiento.tipo,
        procedimiento.objeto,
        procedimiento.entidadContratante,
        procedimiento.estado,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    })
  }, [procedimientos, term])

  const obrasFiltradas = useMemo(() => {
    return obras.filter((obra) => {
      return [
        obra.nombre,
        obra.descripcion,
        obra.ubicacion,
        obra.entidadEjecutora,
        obra.procedimientoAsociado,
        obra.estado,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    })
  }, [obras, term])

  const resumen = useMemo(() => {
    const obrasEnEjecucion = obrasFiltradas.filter((obra) => obra.estado === "En Ejecución")
    const obrasCriticas = obrasFiltradas.filter((obra) => {
      const daysToPlannedEnd = getDaysToDate(obra.fechaFinPrevista, today)
      const financialGap = obra.avanceFisico - obra.avanceFinanciero
      return (
        obra.estado === "Paralizada" ||
        (daysToPlannedEnd !== null && daysToPlannedEnd < 0 && obra.estado !== "Finalizada") ||
        financialGap > 15
      )
    })

    return {
      obrasEnEjecucion: obrasEnEjecucion.length,
      presupuestoActivo: obrasEnEjecucion.reduce(
        (acc, obra) => acc + Number(obra.presupuestoOficial ?? 0),
        0
      ),
      montoEjecutado: obrasFiltradas.reduce(
        (acc, obra) => acc + Number(obra.montoEjecutado ?? 0),
        0
      ),
      certificados: obrasFiltradas.reduce(
        (acc, obra) => acc + Number(obra.certificadosEmitidos ?? 0),
        0
      ),
      obrasCriticas: obrasCriticas.length,
      procedimientosAbiertos: procedimientosFiltrados.filter(
        (procedimiento) =>
          procedimiento.estado === "Publicado" || procedimiento.estado === "En Evaluación"
      ).length,
      entidadesActivas: entidadesFiltradas.filter((entidad) => entidad.estado === "Activo").length,
    }
  }, [entidadesFiltradas, obrasFiltradas, procedimientosFiltrados, today])

  const radarObras = useMemo(() => {
    return obrasFiltradas
      .map((obra) => {
        const daysToPlannedEnd = getDaysToDate(obra.fechaFinPrevista, today)
        const financialGap = Number(obra.avanceFisico ?? 0) - Number(obra.avanceFinanciero ?? 0)
        const remainingBudget =
          Number(obra.presupuestoOficial ?? 0) - Number(obra.montoEjecutado ?? 0)
        const criticidad =
          (obra.estado === "Paralizada" ? 3 : 0) +
          (daysToPlannedEnd !== null && daysToPlannedEnd < 0 && obra.estado !== "Finalizada"
            ? 2
            : 0) +
          (financialGap > 15 ? 2 : 0) +
          (obra.redeterminaciones > 0 ? 1 : 0)

        let accion = "Seguimiento normal"
        if (obra.estado === "Paralizada") accion = "Destrabar circuito y revisar contratista"
        else if (daysToPlannedEnd !== null && daysToPlannedEnd < 0)
          accion = "Regularizar plazo previsto"
        else if (financialGap > 15) accion = "Conciliar avance fisico y financiero"

        return {
          ...obra,
          criticidad,
          accion,
          daysToPlannedEnd,
          financialGap,
          remainingBudget,
        }
      })
      .sort((a, b) => b.criticidad - a.criticidad || a.remainingBudget - b.remainingBudget)
      .slice(0, 6)
  }, [obrasFiltradas, today])

  const coberturaInstitucional = useMemo(() => {
    return ENTIDAD_TIPOS.map((tipo) => {
      const current = entidadesFiltradas.filter((entidad) => entidad.tipo === tipo)
      return {
        tipo,
        total: current.length,
        activas: current.filter((entidad) => entidad.estado === "Activo").length,
        suspendidas: current.filter((entidad) => entidad.estado === "Suspendido").length,
      }
    }).filter((entry) => entry.total > 0)
  }, [entidadesFiltradas])

  const procedimientosClave = useMemo(() => {
    return procedimientosFiltrados
      .map((procedimiento) => ({
        ...procedimiento,
        montoPendiente:
          Number(procedimiento.montoEstimado ?? 0) - Number(procedimiento.montoAdjudicado ?? 0),
      }))
      .sort((a, b) => Number(b.montoEstimado ?? 0) - Number(a.montoEstimado ?? 0))
      .slice(0, 6)
  }, [procedimientosFiltrados])

  const obraDestacada =
    selectedObra && obrasFiltradas.some((obra) => obra.id === selectedObra.id)
      ? selectedObra
      : (obrasFiltradas[0] ?? null)

  const openEntidadCreate = () => {
    setEditingEntidad(null)
    setEntidadError(null)
    setEntidadForm(emptyEntidadForm())
    setEntidadFormOpen(true)
  }

  const openEntidadEdit = (entidad: Entidad) => {
    setEditingEntidad(entidad)
    setEntidadError(null)
    setEntidadForm(buildEntidadForm(entidad))
    setEntidadFormOpen(true)
  }

  const openObraCreate = () => {
    setEditingObra(null)
    setObraError(null)
    setObraForm(emptyObraForm())
    setObraFormOpen(true)
  }

  const openObraEdit = (obra: Obra) => {
    setEditingObra(obra)
    setObraError(null)
    setObraForm(buildObraForm(obra))
    setObraFormOpen(true)
  }

  const openObraDetail = (obra: Obra) => {
    setSelectedObra(obra)
    setDetailObraOpen(true)
  }

  const handleSaveEntidad = async () => {
    if (!entidadForm.nombre.trim() || !entidadForm.personaContacto.trim()) {
      setEntidadError("Nombre y contacto principal son obligatorios.")
      return
    }

    setEntidadSaving(true)
    setEntidadError(null)

    try {
      const payload = {
        nombre: entidadForm.nombre.trim(),
        tipo: entidadForm.tipo,
        cuitCuil: entidadForm.cuitCuil.trim(),
        direccion: entidadForm.direccion.trim(),
        telefono: entidadForm.telefono.trim(),
        email: entidadForm.email.trim(),
        personaContacto: entidadForm.personaContacto.trim(),
        cargoContacto: entidadForm.cargoContacto.trim(),
        estado: entidadForm.estado,
        notas: entidadForm.notas.trim() || undefined,
      }

      if (editingEntidad) {
        await updateEntidad(editingEntidad.id, payload)
      } else {
        await createEntidad(payload)
      }

      setEntidadFormOpen(false)
      setEditingEntidad(null)
      setEntidadForm(emptyEntidadForm())
    } catch (issue) {
      setEntidadError(
        issue instanceof Error ? issue.message : "No se pudo guardar la entidad contratante."
      )
    } finally {
      setEntidadSaving(false)
    }
  }

  const handleSaveObra = async () => {
    if (!obraForm.nombre.trim() || !obraForm.entidadEjecutora.trim() || !obraForm.fechaInicio) {
      setObraError("Nombre, entidad ejecutora y fecha de inicio son obligatorios.")
      return
    }

    setObraSaving(true)
    setObraError(null)

    try {
      const payload = {
        nombre: obraForm.nombre.trim(),
        descripcion: obraForm.descripcion.trim(),
        procedimientoAsociado: obraForm.procedimientoAsociado.trim(),
        entidadEjecutora: obraForm.entidadEjecutora.trim(),
        contratista: obraForm.contratista.trim(),
        inspector: obraForm.inspector.trim(),
        ubicacion: obraForm.ubicacion.trim(),
        fechaInicio: new Date(`${obraForm.fechaInicio}T00:00:00`),
        fechaFinPrevista: obraForm.fechaFinPrevista
          ? new Date(`${obraForm.fechaFinPrevista}T00:00:00`)
          : new Date(`${obraForm.fechaInicio}T00:00:00`),
        fechaFinReal: obraForm.fechaFinReal
          ? new Date(`${obraForm.fechaFinReal}T00:00:00`)
          : undefined,
        presupuestoOficial: Number(obraForm.presupuestoOficial || 0),
        montoEjecutado: Number(obraForm.montoEjecutado || 0),
        avanceFisico: Number(obraForm.avanceFisico || 0),
        avanceFinanciero: Number(obraForm.avanceFinanciero || 0),
        estado: obraForm.estado,
        certificadosEmitidos: Number(obraForm.certificadosEmitidos || 0),
        redeterminaciones: Number(obraForm.redeterminaciones || 0),
        ampliaciones: obraForm.ampliaciones.trim(),
        documentosAsociados: editingObra?.documentosAsociados ?? [],
        observaciones: obraForm.observaciones.trim() || undefined,
      }

      const saved = editingObra
        ? await updateObra(editingObra.id, payload)
        : await createObra(payload)

      setSelectedObra(saved)
      setObraFormOpen(false)
      setEditingObra(null)
      setObraForm(emptyObraForm())
    } catch (issue) {
      setObraError(issue instanceof Error ? issue.message : "No se pudo guardar la obra.")
    } finally {
      setObraSaving(false)
    }
  }

  const handleDeleteEntidad = async (entidad: Entidad) => {
    try {
      await deleteEntidad(entidad.id)
    } catch (issue) {
      setEntidadError(issue instanceof Error ? issue.message : "No se pudo eliminar la entidad.")
    }
  }

  const handleDeleteObra = async (obra: Obra) => {
    try {
      await deleteObra(obra.id)
      if (selectedObra?.id === obra.id) {
        setSelectedObra(null)
        setDetailObraOpen(false)
      }
    } catch (issue) {
      setObraError(issue instanceof Error ? issue.message : "No se pudo eliminar la obra.")
    }
  }

  const handleRefresh = async () => {
    await Promise.all([refetchEntidades(), refetchProcedimientos(), refetchObras()])
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Módulo de Obras</h1>
          <p className="mt-1 text-muted-foreground">
            Consola operativa de obras, procedimientos y entidades usando sólo el contrato actual
            publicado por proyectos.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void handleRefresh()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <Button onClick={openObraCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva obra
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Obras y procedimientos</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Obras en ejecución"
          value={loading ? "..." : resumen.obrasEnEjecucion}
          description="Frentes activos dentro del filtro actual"
          icon={<GanttChartSquare className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Presupuesto activo"
          value={loading ? "..." : formatCurrency(resumen.presupuestoActivo)}
          description="Monto oficial comprometido por obras en ejecución"
          icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Procedimientos abiertos"
          value={loading ? "..." : resumen.procedimientosAbiertos}
          description="Expedientes publicados o en evaluación"
          icon={<FileCheck2 className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Entidades activas"
          value={loading ? "..." : resumen.entidadesActivas}
          description="Contrapartes vigentes en la vista filtrada"
          icon={<Landmark className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Radar operativo de obras</CardTitle>
            <CardDescription>
              Prioriza paralizaciones, desvíos físico-financieros y plazos vencidos con datos
              reales.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {radarObras.length > 0 ? (
              radarObras.map((obra) => (
                <div key={obra.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{obra.nombre}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{obra.ubicacion}</p>
                    </div>
                    <Badge variant={getObraVariant(obra.estado)}>{obra.estado}</Badge>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Desvío físico-financiero</p>
                      <p className="mt-1 font-medium">{obra.financialGap} pts</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Remanente</p>
                      <p className="mt-1 font-medium">{formatCurrency(obra.remainingBudget)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Lectura de plazo</p>
                      <p className="mt-1 font-medium">
                        {obra.daysToPlannedEnd === null
                          ? "Sin fecha"
                          : obra.daysToPlannedEnd < 0
                            ? `Atrasada ${Math.abs(obra.daysToPlannedEnd)} dias`
                            : `${obra.daysToPlannedEnd} dias al hito`}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-md bg-muted/30 p-3 text-sm text-muted-foreground">
                    {obra.accion}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No hay obras visibles para construir el radar operativo.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lectura institucional</CardTitle>
            <CardDescription>
              Cobertura de entidades y volumen administrativo que hoy sí expone el backend.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">Monto ejecutado visible</p>
              <p className="mt-2 text-3xl font-semibold">
                {formatCurrency(resumen.montoEjecutado)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Total acumulado en obras filtradas dentro del contrato actual.
              </p>
            </div>

            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">Certificados emitidos</p>
              <p className="mt-2 text-3xl font-semibold">{resumen.certificados}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Lectura directa del maestro de obras sin simular valuaciones externas.
              </p>
            </div>

            {coberturaInstitucional.length > 0 ? (
              coberturaInstitucional.map((tipo) => (
                <div key={tipo.tipo} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{tipo.tipo}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {tipo.total} entidades visibles
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium">{tipo.activas} activas</p>
                      <p className="text-muted-foreground">{tipo.suspendidas} suspendidas</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No hay entidades visibles en la búsqueda actual.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ActiveTab)}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <TabsList className="grid w-full max-w-xl grid-cols-3">
            <TabsTrigger value="obras">Obras</TabsTrigger>
            <TabsTrigger value="procedimientos">Procedimientos</TabsTrigger>
            <TabsTrigger value="entidades">Entidades</TabsTrigger>
          </TabsList>

          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por nombre, expediente, ubicación o entidad"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        </div>

        <TabsContent value="obras" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
            <Card>
              <CardHeader>
                <CardTitle>Seguimiento de obras</CardTitle>
                <CardDescription>
                  Estado físico, financiero y contractual sin inventar certificados extra ni hitos
                  no publicados.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingObras ? (
                  <div className="flex items-center justify-center rounded-md border py-14 text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cargando obras...
                  </div>
                ) : obrasFiltradas.length > 0 ? (
                  obrasFiltradas.map((obra) => (
                    <div key={obra.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{obra.nombre}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {obra.entidadEjecutora}
                          </p>
                        </div>
                        <Badge variant={getObraVariant(obra.estado)}>{obra.estado}</Badge>
                      </div>

                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Avance físico</span>
                            <span className="font-medium">{obra.avanceFisico}%</span>
                          </div>
                          <Progress className="mt-2 h-2" value={obra.avanceFisico} />
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Avance financiero</span>
                            <span className="font-medium">{obra.avanceFinanciero}%</span>
                          </div>
                          <Progress className="mt-2 h-2" value={obra.avanceFinanciero} />
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Ubicación</p>
                          <p className="mt-1 font-medium">{obra.ubicacion}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Presupuesto</p>
                          <p className="mt-1 font-medium">
                            {formatCurrency(obra.presupuestoOficial)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Ejecutado</p>
                          <p className="mt-1 font-medium">{formatCurrency(obra.montoEjecutado)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Fecha fin prevista</p>
                          <p className="mt-1 font-medium">{formatDate(obra.fechaFinPrevista)}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openObraDetail(obra)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver detalle
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openObraEdit(obra)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleDeleteObra(obra)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
                    No hay obras que coincidan con el filtro actual.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Obra destacada</CardTitle>
                <CardDescription>
                  Ficha rápida del frente más visible dentro del filtro aplicado.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {obraDestacada ? (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{obraDestacada.nombre}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {obraDestacada.procedimientoAsociado || "Sin expediente asociado"}
                        </p>
                      </div>
                      <Badge variant={getObraVariant(obraDestacada.estado)}>
                        {obraDestacada.estado}
                      </Badge>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border p-3">
                        <p className="text-sm text-muted-foreground">Inspector</p>
                        <p className="mt-2 font-medium">{obraDestacada.inspector}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-sm text-muted-foreground">Contratista</p>
                        <p className="mt-2 font-medium">{obraDestacada.contratista}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-sm text-muted-foreground">Certificados</p>
                        <p className="mt-2 font-medium">{obraDestacada.certificadosEmitidos}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-sm text-muted-foreground">Redeterminaciones</p>
                        <p className="mt-2 font-medium">{obraDestacada.redeterminaciones}</p>
                      </div>
                    </div>

                    <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
                      El backend actual permite seguir presupuesto, ejecución, certificados,
                      redeterminaciones y ampliaciones. Actas, hitos valuados y circuitos de pago
                      detallados del legado siguen fuera del contrato visible.
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
                    No hay obra visible para construir la ficha destacada.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="procedimientos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Procedimientos administrativos</CardTitle>
              <CardDescription>
                Vista de lectura sobre licitaciones y contrataciones; el hook actual sólo expone
                consulta y refresco.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {procedimientosClave.map((procedimiento) => (
                  <div key={procedimiento.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{procedimiento.numeroExpediente}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{procedimiento.objeto}</p>
                      </div>
                      <Badge variant={getProcedimientoVariant(procedimiento.estado)}>
                        {procedimiento.estado}
                      </Badge>
                    </div>

                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">Entidad</span>
                        <span className="font-medium">{procedimiento.entidadContratante}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">Monto estimado</span>
                        <span className="font-medium">
                          {formatCurrency(procedimiento.montoEstimado)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">Pendiente visible</span>
                        <span className="font-medium">
                          {formatCurrency(procedimiento.montoPendiente)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">Apertura</span>
                        <span className="font-medium">
                          {formatDate(procedimiento.fechaApertura)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Expediente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Entidad</TableHead>
                    <TableHead>Monto estimado</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Plazo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {procedimientosFiltrados.map((procedimiento) => (
                    <TableRow key={procedimiento.id}>
                      <TableCell className="font-medium">
                        {procedimiento.numeroExpediente}
                      </TableCell>
                      <TableCell>{procedimiento.tipo}</TableCell>
                      <TableCell>{procedimiento.entidadContratante}</TableCell>
                      <TableCell>{formatCurrency(procedimiento.montoEstimado)}</TableCell>
                      <TableCell>
                        <Badge variant={getProcedimientoVariant(procedimiento.estado)}>
                          {procedimiento.estado}
                        </Badge>
                      </TableCell>
                      <TableCell>{procedimiento.plazoEjecucion} dias</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entidades" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openEntidadCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva entidad
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Maestro de entidades</CardTitle>
              <CardDescription>
                Contrapartes reales con contacto, situación y tipo de vínculo institucional.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entidadesFiltradas.map((entidad) => (
                    <TableRow key={entidad.id}>
                      <TableCell className="font-medium">{entidad.nombre}</TableCell>
                      <TableCell>{entidad.tipo}</TableCell>
                      <TableCell>{entidad.personaContacto}</TableCell>
                      <TableCell>{entidad.email || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={getEntidadVariant(entidad.estado)}>{entidad.estado}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEntidadEdit(entidad)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleDeleteEntidad(entidad)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={detailObraOpen} onOpenChange={setDetailObraOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedObra?.nombre ?? "Detalle de obra"}</DialogTitle>
            <DialogDescription>
              Ficha operativa construida con los campos expuestos por el backend de proyectos.
            </DialogDescription>
          </DialogHeader>

          {selectedObra && (
            <div className="space-y-4 py-2">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Avance físico</p>
                  <p className="mt-2 text-2xl font-semibold">{selectedObra.avanceFisico}%</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Avance financiero</p>
                  <p className="mt-2 text-2xl font-semibold">{selectedObra.avanceFinanciero}%</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Certificados</p>
                  <p className="mt-2 text-2xl font-semibold">{selectedObra.certificadosEmitidos}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <div className="mt-2">
                    <Badge variant={getObraVariant(selectedObra.estado)}>
                      {selectedObra.estado}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Ubicación</p>
                  <p className="mt-2 font-medium">{selectedObra.ubicacion}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Entidad ejecutora</p>
                  <p className="mt-2 font-medium">{selectedObra.entidadEjecutora}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Presupuesto oficial</p>
                  <p className="mt-2 font-medium">
                    {formatCurrency(selectedObra.presupuestoOficial)}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Monto ejecutado</p>
                  <p className="mt-2 font-medium">{formatCurrency(selectedObra.montoEjecutado)}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Fecha inicio</p>
                  <p className="mt-2 font-medium">{formatDate(selectedObra.fechaInicio)}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Fecha fin prevista</p>
                  <p className="mt-2 font-medium">{formatDate(selectedObra.fechaFinPrevista)}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Inspector</p>
                  <p className="mt-2 font-medium">{selectedObra.inspector}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Contratista</p>
                  <p className="mt-2 font-medium">{selectedObra.contratista}</p>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Descripción</p>
                <p className="mt-2 text-sm">{selectedObra.descripcion}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Ampliaciones</p>
                  <p className="mt-2 text-sm">
                    {selectedObra.ampliaciones || "Sin ampliaciones cargadas."}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Observaciones</p>
                  <p className="mt-2 text-sm">
                    {selectedObra.observaciones || "Sin observaciones visibles en la API actual."}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailObraOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={entidadFormOpen} onOpenChange={setEntidadFormOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingEntidad ? "Editar entidad" : "Nueva entidad"}</DialogTitle>
            <DialogDescription>
              Alta y mantenimiento sobre el maestro institucional soportado por la API actual.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={entidadForm.nombre}
                onChange={(event) =>
                  setEntidadForm((current) => ({ ...current, nombre: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={entidadForm.tipo}
                onValueChange={(value) =>
                  setEntidadForm((current) => ({ ...current, tipo: value as Entidad["tipo"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTIDAD_TIPOS.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>CUIT/CUIL</Label>
              <Input
                value={entidadForm.cuitCuil}
                onChange={(event) =>
                  setEntidadForm((current) => ({ ...current, cuitCuil: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={entidadForm.estado}
                onValueChange={(value) =>
                  setEntidadForm((current) => ({ ...current, estado: value as Entidad["estado"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTIDAD_ESTADOS.map((estado) => (
                    <SelectItem key={estado} value={estado}>
                      {estado}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Dirección</Label>
              <Input
                value={entidadForm.direccion}
                onChange={(event) =>
                  setEntidadForm((current) => ({ ...current, direccion: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input
                value={entidadForm.telefono}
                onChange={(event) =>
                  setEntidadForm((current) => ({ ...current, telefono: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={entidadForm.email}
                onChange={(event) =>
                  setEntidadForm((current) => ({ ...current, email: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Persona contacto</Label>
              <Input
                value={entidadForm.personaContacto}
                onChange={(event) =>
                  setEntidadForm((current) => ({ ...current, personaContacto: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Cargo contacto</Label>
              <Input
                value={entidadForm.cargoContacto}
                onChange={(event) =>
                  setEntidadForm((current) => ({ ...current, cargoContacto: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Notas</Label>
              <Textarea
                rows={4}
                value={entidadForm.notas}
                onChange={(event) =>
                  setEntidadForm((current) => ({ ...current, notas: event.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEntidadFormOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={entidadSaving} onClick={() => void handleSaveEntidad()}>
              {entidadSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Guardar entidad
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={obraFormOpen} onOpenChange={setObraFormOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{editingObra ? "Editar obra" : "Nueva obra"}</DialogTitle>
            <DialogDescription>
              Alta y mantenimiento con los campos actualmente soportados por el backend de obras.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2 xl:col-span-2">
              <Label>Nombre</Label>
              <Input
                value={obraForm.nombre}
                onChange={(event) =>
                  setObraForm((current) => ({ ...current, nombre: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2 xl:col-span-2">
              <Label>Ubicación</Label>
              <Input
                value={obraForm.ubicacion}
                onChange={(event) =>
                  setObraForm((current) => ({ ...current, ubicacion: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2 xl:col-span-4">
              <Label>Descripción</Label>
              <Textarea
                rows={3}
                value={obraForm.descripcion}
                onChange={(event) =>
                  setObraForm((current) => ({ ...current, descripcion: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2 xl:col-span-2">
              <Label>Procedimiento asociado</Label>
              <Input
                value={obraForm.procedimientoAsociado}
                onChange={(event) =>
                  setObraForm((current) => ({
                    ...current,
                    procedimientoAsociado: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2 xl:col-span-2">
              <Label>Entidad ejecutora</Label>
              <Input
                value={obraForm.entidadEjecutora}
                onChange={(event) =>
                  setObraForm((current) => ({ ...current, entidadEjecutora: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Contratista</Label>
              <Input
                value={obraForm.contratista}
                onChange={(event) =>
                  setObraForm((current) => ({ ...current, contratista: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Inspector</Label>
              <Input
                value={obraForm.inspector}
                onChange={(event) =>
                  setObraForm((current) => ({ ...current, inspector: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={obraForm.estado}
                onValueChange={(value) =>
                  setObraForm((current) => ({ ...current, estado: value as Obra["estado"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OBRA_ESTADOS.map((estado) => (
                    <SelectItem key={estado} value={estado}>
                      {estado}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fecha inicio</Label>
              <Input
                type="date"
                value={obraForm.fechaInicio}
                onChange={(event) =>
                  setObraForm((current) => ({ ...current, fechaInicio: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha fin prevista</Label>
              <Input
                type="date"
                value={obraForm.fechaFinPrevista}
                onChange={(event) =>
                  setObraForm((current) => ({ ...current, fechaFinPrevista: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha fin real</Label>
              <Input
                type="date"
                value={obraForm.fechaFinReal}
                onChange={(event) =>
                  setObraForm((current) => ({ ...current, fechaFinReal: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Presupuesto oficial</Label>
              <Input
                type="number"
                min="0"
                value={obraForm.presupuestoOficial}
                onChange={(event) =>
                  setObraForm((current) => ({ ...current, presupuestoOficial: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Monto ejecutado</Label>
              <Input
                type="number"
                min="0"
                value={obraForm.montoEjecutado}
                onChange={(event) =>
                  setObraForm((current) => ({ ...current, montoEjecutado: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Avance físico</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={obraForm.avanceFisico}
                onChange={(event) =>
                  setObraForm((current) => ({ ...current, avanceFisico: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Avance financiero</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={obraForm.avanceFinanciero}
                onChange={(event) =>
                  setObraForm((current) => ({ ...current, avanceFinanciero: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Certificados emitidos</Label>
              <Input
                type="number"
                min="0"
                value={obraForm.certificadosEmitidos}
                onChange={(event) =>
                  setObraForm((current) => ({
                    ...current,
                    certificadosEmitidos: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Redeterminaciones</Label>
              <Input
                type="number"
                min="0"
                value={obraForm.redeterminaciones}
                onChange={(event) =>
                  setObraForm((current) => ({ ...current, redeterminaciones: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2 xl:col-span-2">
              <Label>Ampliaciones</Label>
              <Input
                value={obraForm.ampliaciones}
                onChange={(event) =>
                  setObraForm((current) => ({ ...current, ampliaciones: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2 xl:col-span-4">
              <Label>Observaciones</Label>
              <Textarea
                rows={4}
                value={obraForm.observaciones}
                onChange={(event) =>
                  setObraForm((current) => ({ ...current, observaciones: event.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setObraFormOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={obraSaving} onClick={() => void handleSaveObra()}>
              {obraSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Guardar obra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
