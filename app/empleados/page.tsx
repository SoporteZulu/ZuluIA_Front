"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Search,
  Users,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit,
  Eye,
  BriefcaseBusiness,
  MapPin,
  Wallet,
} from "lucide-react"
import { useEmpleados } from "@/lib/hooks/useEmpleados"
import { useSucursales } from "@/lib/hooks/useSucursales"
import type { CreateEmpleadoDto, Empleado } from "@/lib/types/empleados"

function formatCurrency(value: number) {
  return value.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  })
}

function formatDate(value?: string) {
  if (!value) return "-"
  return new Date(value).toLocaleDateString("es-AR")
}

function getDaysSince(value?: string) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
}

function getRosterStatus(empleado: Empleado) {
  const missingFields = [
    empleado.legajo,
    empleado.categoria,
    empleado.fechaIngreso,
    empleado.cuit,
  ].filter((value) => !value).length

  if (missingFields === 0) return "Completo"
  if (missingFields === 1) return "Con alerta"
  return "Incompleto"
}

const estadoVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  activo: "default",
  inactivo: "secondary",
  suspendido: "outline",
  licencia: "outline",
}

const EMPTY_FORM: CreateEmpleadoDto = {
  terceroId: 0,
  sucursalId: 0,
  legajo: "",
  categoria: "",
  fechaIngreso: "",
  sueldoBasico: 0,
}

function buildForm(empleado?: Empleado | null): CreateEmpleadoDto {
  if (!empleado) return { ...EMPTY_FORM }

  return {
    terceroId: empleado.terceroId,
    sucursalId: empleado.sucursalId,
    legajo: empleado.legajo ?? "",
    categoria: empleado.categoria ?? "",
    fechaIngreso: empleado.fechaIngreso ? empleado.fechaIngreso.split("T")[0] : "",
    sueldoBasico: Number(empleado.sueldoBasico ?? 0),
  }
}

function DetailFieldGrid({ fields }: { fields: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {fields.map((field) => (
        <div key={field.label} className="rounded-lg bg-muted/40 p-3">
          <span className="mb-1 block text-xs text-muted-foreground">{field.label}</span>
          <p className="text-sm font-medium wrap-break-word">{field.value}</p>
        </div>
      ))}
    </div>
  )
}

interface EmployeeFormProps {
  empleado: Empleado | null
  onClose: () => void
  onSaved: () => void
}

function EmployeeForm({ empleado, onClose, onSaved }: EmployeeFormProps) {
  const { crear, actualizar } = useEmpleados()
  const { sucursales } = useSucursales()
  const [tab, setTab] = useState("principales")
  const [form, setForm] = useState<CreateEmpleadoDto>(buildForm(empleado))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setForm(buildForm(empleado))
  }, [empleado])

  const set = (key: keyof CreateEmpleadoDto, value: string | number | undefined) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    if (!form.terceroId || !form.sucursalId) {
      setError("Tercero y sucursal son obligatorios")
      return
    }

    setSaving(true)
    setError(null)
    const ok = empleado ? await actualizar(empleado.id, form) : await crear(form)
    setSaving(false)

    if (ok) onSaved()
    else setError("No se pudo guardar el empleado")
  }

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid h-auto w-full grid-cols-4">
          <TabsTrigger value="principales" className="py-2 text-xs">
            Principales
          </TabsTrigger>
          <TabsTrigger value="ubicacion" className="py-2 text-xs">
            Ubicación
          </TabsTrigger>
          <TabsTrigger value="laboral" className="py-2 text-xs">
            Laboral
          </TabsTrigger>
          <TabsTrigger value="otros" className="py-2 text-xs">
            Otros
          </TabsTrigger>
        </TabsList>

        <TabsContent value="principales" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>
                ID Tercero <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min={1}
                value={form.terceroId || ""}
                onChange={(e) => set("terceroId", Number(e.target.value) || 0)}
                placeholder="Identificador del maestro de terceros"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Legajo</Label>
              <Input
                value={form.legajo ?? ""}
                onChange={(e) => set("legajo", e.target.value)}
                placeholder="Legajo interno"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Input
                value={form.categoria ?? ""}
                onChange={(e) => set("categoria", e.target.value)}
                placeholder="Categoría laboral"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha de Ingreso</Label>
              <Input
                type="date"
                value={form.fechaIngreso ?? ""}
                onChange={(e) => set("fechaIngreso", e.target.value)}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ubicacion" className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label>
              Sucursal <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.sucursalId ? String(form.sucursalId) : ""}
              onValueChange={(value) => set("sucursalId", Number(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar sucursal" />
              </SelectTrigger>
              <SelectContent>
                {sucursales.map((sucursal) => (
                  <SelectItem key={sucursal.id} value={String(sucursal.id)}>
                    {sucursal.descripcion}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </TabsContent>

        <TabsContent value="laboral" className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label>Sueldo Básico</Label>
            <Input
              type="number"
              min={0}
              value={form.sueldoBasico ?? 0}
              onChange={(e) => set("sueldoBasico", parseFloat(e.target.value) || 0)}
            />
          </div>
        </TabsContent>

        <TabsContent value="otros" className="mt-4 space-y-4">
          <Textarea
            value={
              empleado
                ? `Estado actual: ${empleado.estado}`
                : "Bloque reservado para observaciones, perfiles, áreas y comisiones del legado."
            }
            readOnly
            rows={5}
          />
        </TabsContent>
      </Tabs>

      {error && (
        <p className="flex items-center gap-1 text-sm text-red-500">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 border-t pt-3">
        <Button variant="outline" className="bg-transparent" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Guardando..." : empleado ? "Guardar cambios" : "Crear empleado"}
        </Button>
      </div>
    </div>
  )
}

function EmployeeDetail({
  empleado,
  sucursalNombre,
}: {
  empleado: Empleado
  sucursalNombre: string
}) {
  const principalFields = [
    { label: "ID Empleado", value: String(empleado.id) },
    { label: "ID Tercero", value: String(empleado.terceroId) },
    { label: "Nombre", value: empleado.razonSocial ?? "-" },
    { label: "Legajo", value: empleado.legajo ?? "-" },
    { label: "Categoría", value: empleado.categoria ?? "-" },
    { label: "Estado", value: empleado.estado },
  ]

  const ubicacionFields = [
    { label: "Sucursal", value: sucursalNombre },
    { label: "Ingreso", value: formatDate(empleado.fechaIngreso) },
  ]

  const laboralFields = [
    { label: "Sueldo Básico", value: formatCurrency(Number(empleado.sueldoBasico ?? 0)) },
    {
      label: "Bloques legado",
      value: "Perfiles, áreas, comisiones y fiscal pendientes de endpoint",
    },
  ]

  return (
    <Tabs defaultValue="principales" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="principales">Principales</TabsTrigger>
        <TabsTrigger value="ubicacion">Ubicación</TabsTrigger>
        <TabsTrigger value="laboral">Laboral</TabsTrigger>
        <TabsTrigger value="heredado">Legado</TabsTrigger>
      </TabsList>

      <TabsContent value="principales">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BriefcaseBusiness className="h-4 w-4" /> Datos Principales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={principalFields} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="ubicacion">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4" /> Ubicación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={ubicacionFields} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="laboral">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4" /> Datos Laborales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={laboralFields} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="heredado">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reservado para migración RRHH</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            El formulario legacy de empleados contemplaba domicilios, medios de contacto, perfiles,
            áreas, comisiones, fiscal y observaciones. La estructura queda prevista para conectarse
            a esos datos cuando el backend los exponga.
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

export default function EmpleadosPage() {
  const {
    empleados,
    loading,
    error,
    page,
    setPage,
    totalPages,
    totalCount,
    search,
    setSearch,
    refetch,
  } = useEmpleados()
  const { sucursales } = useSucursales()

  const [filterEstado, setFilterEstado] = useState("todos")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedEmpleado, setSelectedEmpleado] = useState<Empleado | null>(null)
  const [detailEmpleado, setDetailEmpleado] = useState<Empleado | null>(null)

  const filteredEmpleados = empleados.filter((empleado) => {
    if (filterEstado === "todos") return true
    return empleado.estado === filterEstado
  })

  const sucursalMap = new Map(sucursales.map((sucursal) => [sucursal.id, sucursal.descripcion]))
  const activos = empleados.filter((empleado) => empleado.estado === "activo")
  const licenciasOSuspendidos = empleados.filter((empleado) =>
    ["licencia", "suspendido"].includes(empleado.estado)
  )
  const payrollVisible = empleados.reduce(
    (total, empleado) => total + Number(empleado.sueldoBasico ?? 0),
    0
  )
  const recentHires = [...empleados]
    .filter((empleado) => empleado.fechaIngreso)
    .sort(
      (left, right) =>
        new Date(right.fechaIngreso ?? 0).getTime() - new Date(left.fechaIngreso ?? 0).getTime()
    )
    .slice(0, 6)

  const hiresLast90Days = recentHires.filter((empleado) => {
    const days = getDaysSince(empleado.fechaIngreso)
    return days !== null && days <= 90
  }).length

  const rosterAlerts = empleados.filter((empleado) => getRosterStatus(empleado) !== "Completo")

  const branchCoverage = sucursales
    .map((sucursal) => {
      const empleadosSucursal = empleados.filter((empleado) => empleado.sucursalId === sucursal.id)
      const activosSucursal = empleadosSucursal.filter(
        (empleado) => empleado.estado === "activo"
      ).length
      const payrollSucursal = empleadosSucursal.reduce(
        (total, empleado) => total + Number(empleado.sueldoBasico ?? 0),
        0
      )
      const missingRoster = empleadosSucursal.filter(
        (empleado) => getRosterStatus(empleado) !== "Completo"
      ).length

      return {
        id: sucursal.id,
        descripcion: sucursal.descripcion,
        total: empleadosSucursal.length,
        activos: activosSucursal,
        payroll: payrollSucursal,
        missingRoster,
      }
    })
    .filter((item) => item.total > 0)
    .sort((left, right) => right.total - left.total)

  const rosterRadar = [...empleados]
    .sort((left, right) => {
      const leftScore = [left.legajo, left.categoria, left.fechaIngreso, left.cuit].filter(
        Boolean
      ).length
      const rightScore = [right.legajo, right.categoria, right.fechaIngreso, right.cuit].filter(
        Boolean
      ).length
      return leftScore - rightScore
    })
    .slice(0, 8)

  useEffect(() => {
    if (selectedEmpleado) {
      const nextSelected = empleados.find((empleado) => empleado.id === selectedEmpleado.id)

      if (!nextSelected) {
        setSelectedEmpleado(null)
        setIsFormOpen(false)
      } else if (nextSelected !== selectedEmpleado) {
        setSelectedEmpleado(nextSelected)
      }
    }

    if (detailEmpleado) {
      const nextDetail = empleados.find((empleado) => empleado.id === detailEmpleado.id)

      if (!nextDetail) {
        setDetailEmpleado(null)
        setIsDetailOpen(false)
      } else if (nextDetail !== detailEmpleado) {
        setDetailEmpleado(nextDetail)
      }
    }
  }, [detailEmpleado, empleados, selectedEmpleado])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Empleados</h1>
          <p className="text-muted-foreground">
            Gestión de recursos humanos modernizada desde el esquema legacy
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedEmpleado(null)
            setIsFormOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Empleado
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Empleados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{activos.length}</div>
            <p className="text-xs text-muted-foreground">
              {empleados.length
                ? `${Math.round((activos.length / empleados.length) * 100)}% de la nómina visible`
                : "Sin nómina cargada"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Masa Salarial Visible</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(payrollVisible)}</div>
            <p className="text-xs text-muted-foreground">
              Sólo contempla el sueldo básico expuesto por el backend actual
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Altas Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-sky-600">{hiresLast90Days}</div>
            <p className="text-xs text-muted-foreground">
              Ingresos registrados en los últimos 90 días
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Legajos con Alerta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{rosterAlerts.length}</div>
            <p className="text-xs text-muted-foreground">
              Faltan datos clave de categoría, ingreso, legajo o CUIT
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cobertura por Sucursal</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Dotación</TableHead>
                  <TableHead>Activos</TableHead>
                  <TableHead>Nómina Visible</TableHead>
                  <TableHead>Alertas de Legajo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branchCoverage.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                      No hay dotación asociada a sucursales activas.
                    </TableCell>
                  </TableRow>
                )}
                {branchCoverage.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell className="font-medium">{branch.descripcion}</TableCell>
                    <TableCell>{branch.total}</TableCell>
                    <TableCell>{branch.activos}</TableCell>
                    <TableCell>{formatCurrency(branch.payroll)}</TableCell>
                    <TableCell>
                      <Badge variant={branch.missingRoster > 0 ? "outline" : "secondary"}>
                        {branch.missingRoster > 0
                          ? `${branch.missingRoster} pendientes`
                          : "Completo"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Señales Operativas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm font-medium">Estados con seguimiento</p>
              <p className="mt-1 text-2xl font-semibold text-amber-500">
                {licenciasOSuspendidos.length}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Licencias o suspensiones visibles para controlar cobertura operativa.
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm font-medium">Sucursales con alertas</p>
              <p className="mt-1 text-2xl font-semibold">
                {branchCoverage.filter((branch) => branch.missingRoster > 0).length}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Exigen completar legajo antes de extender circuitos de liquidación y acceso.
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm font-medium">Página actual</p>
              <p className="mt-1 text-2xl font-semibold">
                {page} / {totalPages || 1}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                La grilla mantiene paginación, pero la lectura operativa resume toda la tanda
                cargada.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Radar de Legajo</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Situación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rosterRadar.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                      No hay empleados para analizar.
                    </TableCell>
                  </TableRow>
                )}
                {rosterRadar.map((empleado) => (
                  <TableRow key={empleado.id}>
                    <TableCell>
                      <div className="font-medium">{empleado.razonSocial ?? "Sin nombre"}</div>
                      <div className="text-xs text-muted-foreground">
                        {empleado.legajo
                          ? `Legajo ${empleado.legajo}`
                          : `Tercero ${empleado.terceroId}`}
                      </div>
                    </TableCell>
                    <TableCell>
                      {sucursalMap.get(empleado.sucursalId) ?? `Sucursal ${empleado.sucursalId}`}
                    </TableCell>
                    <TableCell>
                      <Badge variant={estadoVariant[empleado.estado] ?? "secondary"}>
                        {empleado.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          getRosterStatus(empleado) === "Completo"
                            ? "secondary"
                            : getRosterStatus(empleado) === "Con alerta"
                              ? "outline"
                              : "destructive"
                        }
                      >
                        {getRosterStatus(empleado)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Altas Más Recientes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentHires.length === 0 && (
              <p className="text-sm text-muted-foreground">
                La API todavía no devuelve fechas de ingreso para esta tanda.
              </p>
            )}
            {recentHires.map((empleado) => {
              const daysSince = getDaysSince(empleado.fechaIngreso)

              return (
                <div key={empleado.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{empleado.razonSocial ?? "Sin nombre visible"}</p>
                      <p className="text-xs text-muted-foreground">
                        {sucursalMap.get(empleado.sucursalId) ?? `Sucursal ${empleado.sucursalId}`}
                        {empleado.categoria ? ` • ${empleado.categoria}` : " • Categoría pendiente"}
                      </p>
                    </div>
                    <Badge variant={daysSince !== null && daysSince <= 90 ? "default" : "outline"}>
                      {daysSince === null ? "Sin fecha" : `${daysSince} días`}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Ingreso: {formatDate(empleado.fechaIngreso)}
                  </p>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative min-w-70 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, legajo o CUIT..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-10"
              />
            </div>
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="w-45">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="inactivo">Inactivo</SelectItem>
                <SelectItem value="suspendido">Suspendido</SelectItem>
                <SelectItem value="licencia">Licencia</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Legajo</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>CUIT</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Ingreso</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Cargando...
                  </TableCell>
                </TableRow>
              )}
              {!loading && filteredEmpleados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <Users className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    No hay empleados registrados
                  </TableCell>
                </TableRow>
              )}
              {filteredEmpleados.map((empleado) => (
                <TableRow
                  key={empleado.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => {
                    setDetailEmpleado(empleado)
                    setIsDetailOpen(true)
                  }}
                >
                  <TableCell className="font-mono">{empleado.legajo ?? "-"}</TableCell>
                  <TableCell className="font-medium">{empleado.razonSocial ?? "-"}</TableCell>
                  <TableCell className="font-mono text-sm">{empleado.cuit ?? "-"}</TableCell>
                  <TableCell>{empleado.categoria ?? "-"}</TableCell>
                  <TableCell>{formatDate(empleado.fechaIngreso)}</TableCell>
                  <TableCell>
                    <Badge variant={estadoVariant[empleado.estado] ?? "secondary"}>
                      {empleado.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDetailEmpleado(empleado)
                          setIsDetailOpen(true)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedEmpleado(empleado)
                          setIsFormOpen(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEmpleado ? "Editar Empleado" : "Nuevo Empleado"}</DialogTitle>
            <DialogDescription>
              Alta y edición mínima sobre la API actual, manteniendo el esquema funcional heredado.
            </DialogDescription>
          </DialogHeader>
          <EmployeeForm
            key={`${selectedEmpleado?.id ?? "new-employee"}-${isFormOpen ? "open" : "closed"}`}
            empleado={selectedEmpleado}
            onClose={() => {
              setIsFormOpen(false)
              setSelectedEmpleado(null)
            }}
            onSaved={() => {
              setIsFormOpen(false)
              refetch()
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailEmpleado?.razonSocial ?? "Detalle de empleado"}</DialogTitle>
            <DialogDescription>
              {detailEmpleado?.legajo ? `Legajo ${detailEmpleado.legajo}` : "Sin legajo"}
            </DialogDescription>
          </DialogHeader>
          {detailEmpleado && (
            <EmployeeDetail
              empleado={detailEmpleado}
              sucursalNombre={
                sucursalMap.get(detailEmpleado.sucursalId) ??
                `Sucursal ${detailEmpleado.sucursalId}`
              }
            />
          )}
          <DialogFooter>
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={() => setIsDetailOpen(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
