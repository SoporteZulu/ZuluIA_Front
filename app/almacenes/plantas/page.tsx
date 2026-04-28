"use client"

import { useMemo, useState } from "react"
import {
  AlertCircle,
  ArrowRightLeft,
  CheckCircle2,
  Eye,
  Loader2,
  MapPin,
  OctagonAlert,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Warehouse,
  XCircle,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { useDepositos } from "@/lib/hooks/useDepositos"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"
import type { Deposito } from "@/lib/types/depositos"

type DepositoFormState = {
  descripcion: string
  esDefault: boolean
}

const emptyForm = (): DepositoFormState => ({
  descripcion: "",
  esDefault: false,
})

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
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  )
}

export default function PlantasPage() {
  const sucursalId = useDefaultSucursalId() ?? 1
  const { depositos, loading, error, crear, actualizar, eliminar, activar, refetch } = useDepositos(
    sucursalId,
    true
  )

  const [search, setSearch] = useState("")
  const [estadoFiltro, setEstadoFiltro] = useState<"todos" | "activos" | "inactivos">("todos")
  const [selectedDepositoId, setSelectedDepositoId] = useState<number | null>(null)
  const [editingDepositoId, setEditingDepositoId] = useState<number | null>(null)
  const [depositoToDeleteId, setDepositoToDeleteId] = useState<number | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [form, setForm] = useState<DepositoFormState>(emptyForm)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [activating, setActivating] = useState(false)

  const selectedDeposito = useMemo(
    () => depositos.find((deposito) => deposito.id === selectedDepositoId) ?? null,
    [depositos, selectedDepositoId]
  )
  const editingDeposito = useMemo(
    () => depositos.find((deposito) => deposito.id === editingDepositoId) ?? null,
    [depositos, editingDepositoId]
  )
  const depositoToDelete = useMemo(
    () => depositos.find((deposito) => deposito.id === depositoToDeleteId) ?? null,
    [depositos, depositoToDeleteId]
  )

  const filteredDepositos = useMemo(() => {
    const term = search.trim().toLowerCase()
    return depositos.filter((deposito) => {
      const matchesSearch =
        !term ||
        deposito.descripcion.toLowerCase().includes(term) ||
        String(deposito.id).includes(term)
      const matchesEstado =
        estadoFiltro === "todos" ||
        (estadoFiltro === "activos" && deposito.activo) ||
        (estadoFiltro === "inactivos" && !deposito.activo)

      return matchesSearch && matchesEstado
    })
  }, [depositos, estadoFiltro, search])

  const visibleStats = useMemo(() => {
    const activos = filteredDepositos.filter((deposito) => deposito.activo).length
    const inactivos = filteredDepositos.filter((deposito) => !deposito.activo).length
    const defaults = filteredDepositos.filter((deposito) => deposito.esDefault).length
    const defaultActivo = filteredDepositos.find(
      (deposito) => deposito.esDefault && deposito.activo
    )
    const defaultsInactivos = filteredDepositos.filter(
      (deposito) => deposito.esDefault && !deposito.activo
    )

    return {
      total: filteredDepositos.length,
      activos,
      inactivos,
      defaults,
      defaultActivo,
      defaultsInactivos,
    }
  }, [filteredDepositos])

  const defaults = depositos.filter((deposito) => deposito.esDefault).length
  const defaultActivo = depositos.find((deposito) => deposito.esDefault && deposito.activo)
  const sinDefault = defaults === 0
  const multiplesDefaults = defaults > 1

  const descripcionesDuplicadas = useMemo(() => {
    const counter = depositos.reduce<Record<string, number>>((accumulator, deposito) => {
      const key = deposito.descripcion.trim().toLowerCase()
      accumulator[key] = (accumulator[key] ?? 0) + 1
      return accumulator
    }, {})

    return Object.entries(counter)
      .filter(([, quantity]) => quantity > 1)
      .map(([description, quantity]) => ({ description, quantity }))
  }, [depositos])

  const visibleDescripcionesDuplicadas = useMemo(() => {
    const counter = filteredDepositos.reduce<Record<string, number>>((accumulator, deposito) => {
      const key = deposito.descripcion.trim().toLowerCase()
      accumulator[key] = (accumulator[key] ?? 0) + 1
      return accumulator
    }, {})

    return Object.entries(counter)
      .filter(([, quantity]) => quantity > 1)
      .map(([description, quantity]) => ({ description, quantity }))
  }, [filteredDepositos])

  const depositoDestacado = useMemo(() => {
    if (filteredDepositos.length === 0) {
      return null
    }

    return [...filteredDepositos].sort((left, right) => {
      const leftScore = Number(left.activo) * 4 + Number(left.esDefault) * 6
      const rightScore = Number(right.activo) * 4 + Number(right.esDefault) * 6

      if (rightScore !== leftScore) {
        return rightScore - leftScore
      }

      return left.descripcion.localeCompare(right.descripcion)
    })[0]
  }, [filteredDepositos])

  const radarOperativo = [
    {
      title: "Cobertura activa",
      value: `${visibleStats.activos}/${visibleStats.total || 0}`,
      description: "Depósitos habilitados hoy para operar en la vista actual.",
      icon: <Warehouse className="h-4 w-4 text-sky-700" />,
    },
    {
      title: "Default operativo",
      value: visibleStats.defaultActivo ? visibleStats.defaultActivo.descripcion : "Sin definir",
      description: visibleStats.defaultActivo
        ? "Es el depósito principal actualmente disponible en la vista."
        : "No hay depósito activo marcado como referencia en la vista.",
      icon: <MapPin className="h-4 w-4 text-emerald-700" />,
    },
    {
      title: "Defaults conflictivos",
      value: visibleStats.defaultsInactivos.length,
      description: "Depósitos por defecto visibles dados de baja o fuera de uso.",
      icon: <OctagonAlert className="h-4 w-4 text-amber-600" />,
    },
    {
      title: "Duplicados nominales",
      value: visibleDescripcionesDuplicadas.length,
      description: "Descripciones repetidas dentro de la vista actual.",
      icon: <ArrowRightLeft className="h-4 w-4 text-rose-600" />,
    },
  ]

  const openCreate = () => {
    setEditingDepositoId(null)
    setSaveError(null)
    setForm(emptyForm())
    setIsFormOpen(true)
  }

  const openEdit = (deposito: Deposito) => {
    setEditingDepositoId(deposito.id)
    setSaveError(null)
    setForm({
      descripcion: deposito.descripcion,
      esDefault: deposito.esDefault,
    })
    setIsFormOpen(true)
  }

  const openDetail = (deposito: Deposito) => {
    setSelectedDepositoId(deposito.id)
    setIsDetailOpen(true)
  }

  const openDelete = (deposito: Deposito) => {
    setDepositoToDeleteId(deposito.id)
    setIsDeleteOpen(true)
  }

  const handleSave = async () => {
    if (!form.descripcion.trim()) {
      setSaveError("La descripción del depósito es obligatoria.")
      return
    }

    setSaving(true)
    setSaveError(null)

    const ok = editingDeposito
      ? await actualizar(editingDeposito.id, form.descripcion.trim(), form.esDefault)
      : await crear({
          sucursalId,
          descripcion: form.descripcion.trim(),
          esDefault: form.esDefault,
        })

    if (!ok) {
      setSaveError(
        editingDeposito ? "No se pudo actualizar el depósito." : "No se pudo crear el depósito."
      )
      setSaving(false)
      return
    }

    await refetch()
    setSaving(false)
    setIsFormOpen(false)
    setEditingDepositoId(null)
    setForm(emptyForm())
  }

  const handleDelete = async () => {
    if (!depositoToDelete) return

    setDeleting(true)
    setSaveError(null)
    const ok = await eliminar(depositoToDelete.id)

    if (!ok) {
      setSaveError("No se pudo desactivar el depósito seleccionado.")
      setDeleting(false)
      return
    }

    await refetch()
    setDeleting(false)
    setIsDeleteOpen(false)
    if (selectedDeposito?.id === depositoToDelete.id) {
      setSelectedDepositoId(null)
      setIsDetailOpen(false)
    }
    setDepositoToDeleteId(null)
  }

  const handleActivate = async (deposito: Deposito) => {
    setActivating(true)
    setSaveError(null)

    const ok = await activar(deposito.id)
    if (!ok) {
      setSaveError("No se pudo reactivar el depósito seleccionado.")
      setActivating(false)
      return
    }

    await refetch()
    toast({
      title: "Depósito reactivado",
      description: `${deposito.descripcion} volvió al circuito operativo.`,
    })
    setActivating(false)
  }

  const handleDetailOpenChange = (open: boolean) => {
    setIsDetailOpen(open)
    if (!open) {
      setSelectedDepositoId(null)
    }
  }

  const handleFormOpenChange = (open: boolean) => {
    setIsFormOpen(open)
    if (!open) {
      setEditingDepositoId(null)
      setSaveError(null)
      setForm(emptyForm())
    }
  }

  const handleDeleteOpenChange = (open: boolean) => {
    setIsDeleteOpen(open)
    if (!open) {
      setDepositoToDeleteId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Plantas y depósitos</h1>
          <p className="text-muted-foreground mt-1">
            Mantenimiento operativo de depósitos por sucursal con alta, edición y baja reales.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo depósito
          </Button>
        </div>
      </div>

      {(error || saveError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Plantas y depósitos</AlertTitle>
          <AlertDescription>{saveError ?? error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Depósitos visibles"
          value={visibleStats.total}
          description={`Vista actual sobre la sucursal operativa ${sucursalId}`}
          icon={<Warehouse className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Activos"
          value={visibleStats.activos}
          description="Depósitos visibles disponibles para operación"
          icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Inactivos"
          value={visibleStats.inactivos}
          description="Depósitos visibles dados de baja o fuera de uso"
          icon={<XCircle className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Por defecto"
          value={visibleStats.defaults}
          description={
            visibleStats.defaultActivo
              ? `Principal activo visible: ${visibleStats.defaultActivo.descripcion}`
              : "Sin principal activo visible"
          }
          icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {radarOperativo.map((item) => (
          <Card key={item.title}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                {item.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">{item.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Radar de configuración</CardTitle>
            <CardDescription>
              Señales rápidas para detectar desvíos en defaults, bajas y nombres repetidos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium">Sucursal visible</p>
              <p className="mt-1 text-2xl font-semibold">#{sucursalId}</p>
              <p className="text-xs text-muted-foreground mt-1">
                La consola trabaja sólo sobre la sucursal activa provista por el contexto actual.
              </p>
            </div>

            <div className="space-y-3">
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">Política de depósito principal</p>
                  <Badge variant={sinDefault || multiplesDefaults ? "destructive" : "outline"}>
                    {sinDefault
                      ? "Sin default"
                      : multiplesDefaults
                        ? "Múltiples defaults"
                        : "Consistente"}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {sinDefault
                    ? "No hay ningún depósito marcado como principal para la sucursal activa."
                    : multiplesDefaults
                      ? `Hay ${defaults} depósitos marcados como default; conviene consolidar uno solo.`
                      : `El principal activo es ${defaultActivo?.descripcion ?? "N/D"}.`}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">Descripciones repetidas</p>
                  <Badge variant={descripcionesDuplicadas.length > 0 ? "secondary" : "outline"}>
                    {descripcionesDuplicadas.length}
                  </Badge>
                </div>
                {descripcionesDuplicadas.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No se detectan nombres duplicados con la información actual.
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {descripcionesDuplicadas.slice(0, 3).map((item) => (
                      <div
                        key={item.description}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="font-medium capitalize">{item.description}</span>
                        <span className="text-muted-foreground">{item.quantity} registros</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Depósito destacado</CardTitle>
            <CardDescription>
              Lectura rápida del depósito más relevante para la operación visible hoy.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {depositoDestacado ? (
              <div className="space-y-4 rounded-xl border border-sky-200 bg-sky-50/70 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-sky-900">Referencia operativa</p>
                    <h3 className="mt-1 text-xl font-semibold text-sky-950">
                      {depositoDestacado.descripcion}
                    </h3>
                    <p className="text-sm text-sky-900/80">
                      Sucursal {depositoDestacado.sucursalId}
                    </p>
                  </div>
                  <Badge variant={depositoDestacado.activo ? "secondary" : "destructive"}>
                    {depositoDestacado.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-sky-200 bg-white/70 p-3">
                    <p className="text-xs uppercase tracking-wide text-sky-900/70">
                      Tipo de referencia
                    </p>
                    <p className="mt-1 text-sm font-medium text-sky-950">
                      {depositoDestacado.esDefault
                        ? "Principal de sucursal"
                        : "Depósito secundario"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-sky-200 bg-white/70 p-3">
                    <p className="text-xs uppercase tracking-wide text-sky-900/70">
                      Riesgo visible
                    </p>
                    <p className="mt-1 text-sm font-medium text-sky-950">
                      {!depositoDestacado.activo
                        ? "Fuera del circuito activo"
                        : depositoDestacado.esDefault && multiplesDefaults
                          ? "Conflicto por múltiples defaults"
                          : "Sin conflicto inmediato"}
                    </p>
                  </div>
                </div>

                <Button variant="outline" onClick={() => openDetail(depositoDestacado)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Ver detalle completo
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay depósitos cargados para destacar en la sucursal actual.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros y consulta</CardTitle>
          <CardDescription>
            Busca por ID o descripción y controla la visibilidad de depósitos activos e inactivos.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_220px]">
          <div className="space-y-2">
            <Label>Buscar depósito</Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Descripción o ID"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Estado</Label>
            <Select
              value={estadoFiltro}
              onValueChange={(value) => setEstadoFiltro(value as "todos" | "activos" | "inactivos")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="activos">Activos</SelectItem>
                <SelectItem value="inactivos">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Depósitos</CardTitle>
          <CardDescription>{filteredDepositos.length} registros en la vista actual</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Predeterminado</TableHead>
                <TableHead>Lectura operativa</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    <div className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando depósitos...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredDepositos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    No hay depósitos para los filtros actuales.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDepositos.map((deposito) => (
                  <TableRow key={deposito.id}>
                    <TableCell className="font-medium">#{deposito.id}</TableCell>
                    <TableCell>{deposito.descripcion}</TableCell>
                    <TableCell>{deposito.sucursalId}</TableCell>
                    <TableCell>
                      <Badge variant={deposito.activo ? "default" : "secondary"}>
                        {deposito.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {deposito.esDefault ? (
                        <Badge variant="outline">Sí</Badge>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {!deposito.activo
                          ? "Fuera del circuito activo"
                          : deposito.esDefault
                            ? "Principal operativo"
                            : "Cobertura secundaria"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openDetail(deposito)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEdit(deposito)}>
                          Editar
                        </Button>
                        {deposito.activo ? (
                          <Button size="sm" variant="outline" onClick={() => openDelete(deposito)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={activating}
                            onClick={() => void handleActivate(deposito)}
                          >
                            Reactivar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDetailOpen && !!selectedDeposito} onOpenChange={handleDetailOpenChange}>
        <WmsDialogContent size="md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Warehouse className="h-5 w-5" />
              {selectedDeposito?.descripcion ?? "Detalle del depósito"}
            </DialogTitle>
            <DialogDescription>
              Datos actualmente expuestos por el backend de depósitos.
            </DialogDescription>
          </DialogHeader>

          {selectedDeposito && (
            <div className="grid gap-4 py-2 sm:grid-cols-2">
              <div>
                <span className="text-sm text-muted-foreground">ID</span>
                <p className="font-medium">{selectedDeposito.id}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Sucursal</span>
                <p className="font-medium">{selectedDeposito.sucursalId}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Estado</span>
                <div className="mt-1">
                  <Badge variant={selectedDeposito.activo ? "default" : "secondary"}>
                    {selectedDeposito.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Depósito por defecto</span>
                <p className="font-medium">{selectedDeposito.esDefault ? "Sí" : "No"}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            {selectedDeposito && (
              <>
                <Button variant="outline" onClick={() => openEdit(selectedDeposito)}>
                  Editar depósito
                </Button>
                {!selectedDeposito.activo && (
                  <Button
                    disabled={activating}
                    onClick={() => void handleActivate(selectedDeposito)}
                  >
                    Reactivar depósito
                  </Button>
                )}
              </>
            )}
            <Button variant="outline" onClick={() => handleDetailOpenChange(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </WmsDialogContent>
      </Dialog>

      <Dialog open={isFormOpen} onOpenChange={handleFormOpenChange}>
        <WmsDialogContent size="md">
          <DialogHeader>
            <DialogTitle>{editingDeposito ? "Editar depósito" : "Nuevo depósito"}</DialogTitle>
            <DialogDescription>
              Alta y mantenimiento real sobre la sucursal activa.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Input
                id="descripcion"
                value={form.descripcion}
                onChange={(event) =>
                  setForm((current) => ({ ...current, descripcion: event.target.value }))
                }
                placeholder="Depósito principal, planta norte, etc."
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.esDefault}
                onChange={(event) =>
                  setForm((current) => ({ ...current, esDefault: event.target.checked }))
                }
                className="h-4 w-4"
              />
              Marcar como depósito por defecto
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleFormOpenChange(false)}>
              Cancelar
            </Button>
            <Button disabled={saving} onClick={() => void handleSave()}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar depósito
            </Button>
          </DialogFooter>
        </WmsDialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen && !!depositoToDelete} onOpenChange={handleDeleteOpenChange}>
        <WmsDialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Desactivar depósito</DialogTitle>
            <DialogDescription>
              Esta acción usa la baja soportada por backend para quitar el depósito del circuito
              activo.
            </DialogDescription>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            {depositoToDelete
              ? `Se desactivará ${depositoToDelete.descripcion}.`
              : "No hay depósito seleccionado."}
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleDeleteOpenChange(false)}>
              Cancelar
            </Button>
            <Button disabled={deleting || !depositoToDelete} onClick={() => void handleDelete()}>
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Confirmar baja
            </Button>
          </DialogFooter>
        </WmsDialogContent>
      </Dialog>
    </div>
  )
}
