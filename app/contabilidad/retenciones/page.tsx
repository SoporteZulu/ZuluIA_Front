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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRetencionesPorPersona, useRetencionesTipos } from "@/lib/hooks/useRetenciones"
import { useProveedores } from "@/lib/hooks/useTerceros"
import type { RetencionesTipo } from "@/lib/types/retenciones"
import type { Tercero } from "@/lib/types/terceros"
import {
  AlertCircle,
  Building2,
  CalendarClock,
  CheckCircle,
  ClipboardList,
  Eye,
  Percent,
  Plus,
  RefreshCcw,
  ScrollText,
  Search,
  UserRound,
} from "lucide-react"

function fmtPercent(value: number) {
  return Number(value ?? 0).toLocaleString("es-AR", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  })
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "-"
}

function formatProviderAddress(proveedor?: Tercero | null) {
  if (!proveedor) return "Sin domicilio visible"

  const parts = [
    [proveedor.calle, proveedor.nro].filter(Boolean).join(" "),
    proveedor.piso ? `Piso ${proveedor.piso}` : null,
    proveedor.dpto ? `Dto ${proveedor.dpto}` : null,
    proveedor.localidadDescripcion,
    proveedor.codigoPostal,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(" · ") : "Sin domicilio visible"
}

function getAssignmentStatus(vigente: boolean, porcentaje?: number) {
  if (!vigente) {
    return {
      label: "Histórica",
      detail: "La retención existe en el legajo, pero no está activa para nuevas liquidaciones.",
    }
  }

  if ((porcentaje ?? 0) <= 0) {
    return {
      label: "Vigente sin alícuota",
      detail: "La asignación está activa, pero no informa porcentaje explícito en este registro.",
    }
  }

  return {
    label: "Vigente",
    detail: "La asignación está disponible para el circuito fiscal actual del proveedor.",
  }
}

function DetailFieldGrid({ fields }: { fields: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {fields.map((field) => (
        <div key={field.label} className="rounded-lg bg-muted/40 p-3">
          <Label>{field.label}</Label>
          <p className="text-sm font-medium">{field.value}</p>
        </div>
      ))}
    </div>
  )
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

export default function RetencionesPage() {
  const [soloActivos, setSoloActivos] = useState(true)
  const { tipos, loading, error, refetch } = useRetencionesTipos(soloActivos)
  const {
    terceros: proveedores,
    loading: loadingProveedores,
    error: errorProveedores,
    totalCount: totalProveedores,
    page,
    setPage,
    totalPages,
    search,
    setSearch,
  } = useProveedores()
  const [preferredProveedorId, setPreferredProveedorId] = useState<number | null>(null)
  const selectedProveedorId = useMemo(() => {
    if (!proveedores.length) return null

    if (
      preferredProveedorId &&
      proveedores.some((proveedor) => proveedor.id === preferredProveedorId)
    ) {
      return preferredProveedorId
    }

    return proveedores[0].id
  }, [preferredProveedorId, proveedores])
  const {
    retenciones,
    loading: loadingAsignaciones,
    error: errorAsignaciones,
    agregar,
    refetch: refetchAsignaciones,
  } = useRetencionesPorPersona(selectedProveedorId ?? undefined)
  const [selectedTipo, setSelectedTipo] = useState<RetencionesTipo | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [draftTipoId, setDraftTipoId] = useState("")
  const [draftPorcentaje, setDraftPorcentaje] = useState("")
  const [draftVigente, setDraftVigente] = useState(true)

  const activos = tipos.filter((tipo) => tipo.activo).length
  const promedio =
    tipos.length > 0
      ? fmtPercent(tipos.reduce((sum, tipo) => sum + tipo.porcentaje, 0) / tipos.length)
      : "0.0000"
  const proveedoresConDocumento = proveedores.filter((proveedor) =>
    Boolean(proveedor.nroDocumento)
  ).length
  const proveedoresConIngresosBrutos = proveedores.filter((proveedor) =>
    Boolean(proveedor.nroIngresosBrutos)
  ).length
  const asignacionesVigentes = retenciones.filter((retencion) => retencion.vigente).length
  const asignacionesPersonalizadas = retenciones.filter(
    (retencion) => typeof retencion.porcentaje === "number" && retencion.porcentaje > 0
  ).length

  const selectedProveedor = useMemo(
    () => proveedores.find((proveedor) => proveedor.id === selectedProveedorId) ?? null,
    [proveedores, selectedProveedorId]
  )

  const availableTipos = useMemo(
    () =>
      tipos.filter(
        (tipo) =>
          !retenciones.some(
            (retencion) => retencion.retencionTipoId === tipo.id && retencion.vigente
          )
      ),
    [retenciones, tipos]
  )

  const openDetail = (tipo: RetencionesTipo) => {
    setSelectedTipo(tipo)
    setDetailOpen(true)
  }

  const openAssign = () => {
    setAssignError(null)
    setDraftTipoId("")
    setDraftPorcentaje("")
    setDraftVigente(true)
    setAssignOpen(true)
  }

  const handleAssign = async () => {
    setAssignError(null)

    if (!selectedProveedorId) {
      setAssignError("Seleccioná un proveedor para cargar una retención.")
      return
    }

    const retencionTipoId = Number(draftTipoId)
    if (!retencionTipoId) {
      setAssignError("Elegí un tipo de retención para asignar.")
      return
    }

    const porcentaje = draftPorcentaje.trim() ? Number(draftPorcentaje) : undefined
    if (draftPorcentaje.trim() && Number.isNaN(porcentaje)) {
      setAssignError("El porcentaje informado no es válido.")
      return
    }

    setSaving(true)
    const ok = await agregar({
      retencionTipoId,
      porcentaje,
      vigente: draftVigente,
    })
    setSaving(false)

    if (!ok) {
      setAssignError("No se pudo registrar la retención para el proveedor seleccionado.")
      return
    }

    setAssignOpen(false)
    await refetchAsignaciones()
  }

  const errorMessage = assignError || error || errorProveedores || errorAsignaciones

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Retenciones</h1>
          <p className="text-muted-foreground">
            Consola fiscal para revisar tipos vigentes y administrar asignaciones por proveedor con
            los endpoints reales disponibles.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={refetch} disabled={loading}>
            <RefreshCcw className="h-4 w-4" />
            Actualizar tipos
          </Button>
          <Button onClick={openAssign} disabled={!selectedProveedorId}>
            <Plus className="h-4 w-4" />
            Asignar retención
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
          title="Tipos cargados"
          value={String(tipos.length)}
          description={
            soloActivos
              ? "Vista restringida a tipos activos."
              : "Incluye tipos activos e inactivos."
          }
        />
        <SummaryCard
          title="Tipos activos"
          value={String(activos)}
          description="Esquemas de retención vigentes disponibles para asignación."
        />
        <SummaryCard
          title="Promedio nominal"
          value={`${promedio}%`}
          description="Promedio simple de porcentajes configurados en el catálogo."
        />
        <SummaryCard
          title="Retenciones del proveedor"
          value={selectedProveedor ? String(retenciones.length) : "0"}
          description={
            selectedProveedor
              ? selectedProveedor.razonSocial
              : "Seleccioná un proveedor para ver detalle."
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4" /> Legajo fiscal visible
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {proveedoresConDocumento} proveedores muestran documento y{" "}
            {proveedoresConIngresosBrutos} informan ingresos brutos en la página actual del padrón.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="h-4 w-4" /> Estado del proveedor
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {selectedProveedor
              ? `${asignacionesVigentes} asignaciones vigentes y ${asignacionesPersonalizadas} con porcentaje explícito para ${selectedProveedor.razonSocial}.`
              : "Seleccioná un proveedor para leer vigencia, alícuotas y legajo fiscal."}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ScrollText className="h-4 w-4" /> Alcance de fase actual
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            La pantalla cubre catálogo y asignaciones reales por proveedor. Quedan pendientes
            certificados, historial documental y reglas avanzadas por jurisdicción.
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parámetros de consulta</CardTitle>
          <CardDescription>
            El catálogo fiscal y el padrón de proveedores se consultan por separado para trabajar
            sobre asignaciones reales.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Switch id="solo-activos" checked={soloActivos} onCheckedChange={setSoloActivos} />
            <Label htmlFor="solo-activos">Solo tipos activos</Label>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Buscar proveedor por razón social..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Proveedores</CardTitle>
            </div>
            <CardDescription>
              Página {page} de {Math.max(totalPages, 1)} · {totalProveedores} proveedores activos
              disponibles.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingProveedores ? (
              <p className="text-sm text-muted-foreground">Cargando proveedores...</p>
            ) : proveedores.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No hay proveedores para la búsqueda actual.
              </div>
            ) : (
              proveedores.map((proveedor) => {
                const isSelected = proveedor.id === selectedProveedorId

                return (
                  <button
                    key={proveedor.id}
                    type="button"
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      isSelected ? "border-primary bg-accent/40" : "hover:bg-accent/20"
                    }`}
                    onClick={() => setPreferredProveedorId(proveedor.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{proveedor.razonSocial}</p>
                        <p className="text-sm text-muted-foreground">
                          {proveedor.nroDocumento ?? "Sin documento"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {proveedor.condicionIvaDescripcion ?? "Sin condición IVA visible"}
                          {proveedor.nroIngresosBrutos
                            ? ` · IIBB ${proveedor.nroIngresosBrutos}`
                            : " · Sin IIBB visible"}
                        </p>
                      </div>
                      {isSelected && <Badge variant="default">Seleccionado</Badge>}
                    </div>
                  </button>
                )
              })
            )}

            <div className="flex items-center justify-between gap-2 border-t pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                {page}/{Math.max(totalPages, 1)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
              >
                Siguiente
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selectedProveedor
                ? `Retenciones de ${selectedProveedor.razonSocial}`
                : "Retenciones por proveedor"}
            </CardTitle>
            <CardDescription>
              {selectedProveedor
                ? "Asignaciones vigentes e históricas recuperadas para el tercero seleccionado."
                : "Seleccioná un proveedor para cargar o revisar retenciones."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingAsignaciones ? (
              <p className="text-sm text-muted-foreground">Cargando retenciones del proveedor...</p>
            ) : !selectedProveedor ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No hay proveedor seleccionado.
              </div>
            ) : retenciones.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Este proveedor todavía no tiene retenciones configuradas.
              </div>
            ) : (
              retenciones.map((retencion) => {
                const assignmentStatus = getAssignmentStatus(
                  retencion.vigente,
                  retencion.porcentaje
                )

                return (
                  <div key={retencion.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          {retencion.retencionTipoDescripcion ??
                            `Tipo #${retencion.retencionTipoId}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Porcentaje aplicado: {fmtPercent(retencion.porcentaje ?? 0)}%
                        </p>
                        <p className="text-xs text-muted-foreground">{assignmentStatus.detail}</p>
                      </div>
                      <Badge variant={retencion.vigente ? "default" : "secondary"}>
                        {assignmentStatus.label}
                      </Badge>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Catálogo de tipos</CardTitle>
          <CardDescription>
            Vista de referencia para códigos fiscales, porcentaje nominal y estado del esquema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Porcentaje</TableHead>
                <TableHead>Circuito</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Cargando tipos de retención...
                  </TableCell>
                </TableRow>
              ) : tipos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No hay tipos de retención para mostrar.
                  </TableCell>
                </TableRow>
              ) : (
                tipos.map((tipo) => (
                  <TableRow key={tipo.id}>
                    <TableCell className="font-mono font-medium">{tipo.codigo}</TableCell>
                    <TableCell>{tipo.descripcion}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {fmtPercent(tipo.porcentaje)}%
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {tipo.activo
                        ? "Disponible para asignaciones vigentes"
                        : "Conservado solo como referencia histórica"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={tipo.activo ? "default" : "secondary"}>
                        {tipo.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openDetail(tipo)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              {selectedTipo?.descripcion}
            </DialogTitle>
            <DialogDescription>Código: {selectedTipo?.codigo}</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="general" className="py-2">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="circuito">Circuito</TabsTrigger>
              <TabsTrigger value="proveedor">Proveedor</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 pt-4">
              <DetailFieldGrid
                fields={[
                  { label: "ID", value: String(selectedTipo?.id ?? "-") },
                  { label: "Código", value: selectedTipo?.codigo ?? "-" },
                  { label: "Descripción", value: selectedTipo?.descripcion ?? "-" },
                  {
                    label: "Estado",
                    value: selectedTipo ? (selectedTipo.activo ? "Activo" : "Inactivo") : "-",
                  },
                  {
                    label: "Porcentaje nominal",
                    value: selectedTipo ? `${fmtPercent(selectedTipo.porcentaje)}%` : "-",
                  },
                  {
                    label: "Proveedor seleccionado",
                    value: selectedProveedor?.razonSocial ?? "Sin proveedor seleccionado",
                  },
                ]}
              />
            </TabsContent>

            <TabsContent value="circuito" className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarClock className="h-4 w-4" /> Lectura operativa
                  </CardTitle>
                  <CardDescription>
                    {selectedTipo?.activo
                      ? "El tipo está disponible para nuevas asignaciones vigentes."
                      : "El tipo quedó como referencia histórica y no debería elegirse para nuevos circuitos."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DetailFieldGrid
                    fields={[
                      {
                        label: "Estado de catálogo",
                        value: selectedTipo?.activo ? "Disponible" : "Histórico",
                      },
                      {
                        label: "Promedio del catálogo",
                        value: `${promedio}%`,
                      },
                      {
                        label: "Asignaciones vigentes del proveedor",
                        value: String(asignacionesVigentes),
                      },
                      {
                        label: "Tipos disponibles para asignar",
                        value: String(availableTipos.length),
                      },
                    ]}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="proveedor" className="space-y-4 pt-4">
              <DetailFieldGrid
                fields={[
                  {
                    label: "Razón social",
                    value: selectedProveedor?.razonSocial ?? "Sin proveedor seleccionado",
                  },
                  {
                    label: "Documento",
                    value: selectedProveedor?.nroDocumento ?? "Sin documento visible",
                  },
                  {
                    label: "Condición IVA",
                    value: selectedProveedor?.condicionIvaDescripcion ?? "Sin condición visible",
                  },
                  {
                    label: "Ingresos Brutos",
                    value: selectedProveedor?.nroIngresosBrutos ?? "Sin IIBB visible",
                  },
                  { label: "Correo", value: selectedProveedor?.email ?? "Sin correo visible" },
                  {
                    label: "Teléfono",
                    value:
                      selectedProveedor?.telefono ??
                      selectedProveedor?.celular ??
                      "Sin teléfono visible",
                  },
                  { label: "Domicilio", value: formatProviderAddress(selectedProveedor) },
                  { label: "Alta de legajo", value: formatDate(selectedProveedor?.createdAt) },
                ]}
              />
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar retención al proveedor</DialogTitle>
            <DialogDescription>
              {selectedProveedor
                ? `Registrá una retención para ${selectedProveedor.razonSocial}.`
                : "Seleccioná un proveedor antes de continuar."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedProveedor && (
              <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <Building2 className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Legajo del proveedor</p>
                    <p>
                      {selectedProveedor.razonSocial} ·{" "}
                      {selectedProveedor.nroDocumento ?? "Sin documento"} ·{" "}
                      {selectedProveedor.condicionIvaDescripcion ?? "Sin condición IVA visible"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="retencion-tipo">Tipo de retención</Label>
              <Select value={draftTipoId} onValueChange={setDraftTipoId}>
                <SelectTrigger id="retencion-tipo" className="w-full">
                  <SelectValue placeholder="Elegir tipo" />
                </SelectTrigger>
                <SelectContent>
                  {availableTipos.map((tipo) => (
                    <SelectItem key={tipo.id} value={String(tipo.id)}>
                      {tipo.codigo} · {tipo.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="retencion-porcentaje">Porcentaje personalizado</Label>
              <Input
                id="retencion-porcentaje"
                type="number"
                min="0"
                step="0.0001"
                placeholder="Dejar vacío para usar el valor del tipo"
                value={draftPorcentaje}
                onChange={(event) => setDraftPorcentaje(event.target.value)}
              />
            </div>

            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Switch
                id="retencion-vigente"
                checked={draftVigente}
                onCheckedChange={setDraftVigente}
              />
              <Label htmlFor="retencion-vigente">Registrar como vigente</Label>
            </div>

            {availableTipos.length === 0 && (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No quedan tipos activos sin asignar para este proveedor en la vista actual.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAssign} disabled={saving || availableTipos.length === 0}>
              {saving ? "Guardando..." : "Registrar retención"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
