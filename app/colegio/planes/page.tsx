"use client"

import { useMemo, useState } from "react"
import { PencilLine, Plus, Search } from "lucide-react"

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useLegacyLocalCollection } from "@/lib/hooks/useLegacyLocalCollection"
import {
  legacySchoolLots,
  legacySchoolPlans,
  type LegacySchoolLot,
  type LegacySchoolPlan,
} from "@/lib/legacy-masters-data"

type PlanFormState = {
  id?: string
  nombre: string
  tipo: string
  alumnos: string
  cuotas: string
  bonificacionPct: string
  vigencia: string
  estado: LegacySchoolPlan["estado"]
  observacion: string
}

type LotFormState = {
  id?: string
  codigo: string
  tipo: string
  periodo: string
  registros: string
  responsable: string
  estado: LegacySchoolLot["estado"]
  observacion: string
}

const initialPlanForm: PlanFormState = {
  nombre: "",
  tipo: "",
  alumnos: "0",
  cuotas: "0",
  bonificacionPct: "0",
  vigencia: "",
  estado: "borrador",
  observacion: "",
}

const initialLotForm: LotFormState = {
  codigo: "",
  tipo: "",
  periodo: "",
  registros: "0",
  responsable: "",
  estado: "preparacion",
  observacion: "",
}

function planBadge(value: LegacySchoolPlan["estado"]) {
  if (value === "cerrado") return <Badge variant="outline">Cerrado</Badge>
  if (value === "borrador") return <Badge variant="secondary">Borrador</Badge>
  return <Badge>Vigente</Badge>
}

function lotBadge(value: LegacySchoolLot["estado"]) {
  if (value === "cerrado") return <Badge variant="outline">Cerrado</Badge>
  if (value === "control") return <Badge variant="secondary">Control</Badge>
  if (value === "emitido") return <Badge>Emitido</Badge>
  return <Badge variant="destructive">Preparacion</Badge>
}

export default function ColegioPlanesPage() {
  const { rows: plans, setRows: setPlans } = useLegacyLocalCollection<LegacySchoolPlan>(
    "legacy-school-plans",
    legacySchoolPlans
  )
  const { rows: lots, setRows: setLots } = useLegacyLocalCollection<LegacySchoolLot>(
    "legacy-school-lots",
    legacySchoolLots
  )
  const [tab, setTab] = useState<"planes" | "lotes">("planes")
  const [search, setSearch] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [planForm, setPlanForm] = useState<PlanFormState>(initialPlanForm)
  const [lotForm, setLotForm] = useState<LotFormState>(initialLotForm)

  const filteredPlans = useMemo(() => {
    const term = search.trim().toLowerCase()
    return plans.filter(
      (row) =>
        !term ||
        row.nombre.toLowerCase().includes(term) ||
        row.tipo.toLowerCase().includes(term) ||
        row.vigencia.toLowerCase().includes(term)
    )
  }, [plans, search])

  const filteredLots = useMemo(() => {
    const term = search.trim().toLowerCase()
    return lots.filter(
      (row) =>
        !term ||
        row.codigo.toLowerCase().includes(term) ||
        row.tipo.toLowerCase().includes(term) ||
        row.periodo.toLowerCase().includes(term) ||
        row.responsable.toLowerCase().includes(term)
    )
  }, [lots, search])

  const highlightedPlan = filteredPlans[0] ?? plans[0] ?? null
  const highlightedLot = filteredLots[0] ?? lots[0] ?? null

  const openPlanDialog = (row?: LegacySchoolPlan) => {
    setPlanForm(
      row
        ? {
            id: row.id,
            nombre: row.nombre,
            tipo: row.tipo,
            alumnos: String(row.alumnos),
            cuotas: String(row.cuotas),
            bonificacionPct: String(row.bonificacionPct),
            vigencia: row.vigencia,
            estado: row.estado,
            observacion: row.observacion,
          }
        : initialPlanForm
    )
    setTab("planes")
    setIsDialogOpen(true)
  }

  const openLotDialog = (row?: LegacySchoolLot) => {
    setLotForm(
      row
        ? {
            id: row.id,
            codigo: row.codigo,
            tipo: row.tipo,
            periodo: row.periodo,
            registros: String(row.registros),
            responsable: row.responsable,
            estado: row.estado,
            observacion: row.observacion,
          }
        : initialLotForm
    )
    setTab("lotes")
    setIsDialogOpen(true)
  }

  function saveCurrentTab() {
    if (tab === "planes") {
      const nextRow: LegacySchoolPlan = {
        id: planForm.id ?? globalThis.crypto.randomUUID(),
        nombre: planForm.nombre,
        tipo: planForm.tipo,
        alumnos: Number(planForm.alumnos),
        cuotas: Number(planForm.cuotas),
        bonificacionPct: Number(planForm.bonificacionPct),
        vigencia: planForm.vigencia,
        estado: planForm.estado,
        observacion: planForm.observacion,
      }

      setPlans((current) =>
        planForm.id
          ? current.map((row) => (row.id === planForm.id ? nextRow : row))
          : [nextRow, ...current]
      )
    }

    if (tab === "lotes") {
      const nextRow: LegacySchoolLot = {
        id: lotForm.id ?? globalThis.crypto.randomUUID(),
        codigo: lotForm.codigo,
        tipo: lotForm.tipo,
        periodo: lotForm.periodo,
        registros: Number(lotForm.registros),
        responsable: lotForm.responsable,
        estado: lotForm.estado,
        observacion: lotForm.observacion,
      }

      setLots((current) =>
        lotForm.id
          ? current.map((row) => (row.id === lotForm.id ? nextRow : row))
          : [nextRow, ...current]
      )
    }

    setIsDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Colegio: Planes y Lotes</h1>
        <p className="mt-1 text-muted-foreground">
          Circuito agrupado para `frmColegioPlanesGenerales`, `frmColegioPlanesPagos`,
          `frmColegioGeneracion`, `frmColegioListados`, `frmColegioLotes` y `frmColegioFinProyecto`.
        </p>
      </div>

      <Alert>
        <AlertTitle>Cobertura por circuito</AlertTitle>
        <AlertDescription>
          Se prioriza paridad funcional de consulta y mantenimiento sobre datasets locales
          persistidos, sin crear contratos educativos falsos en el backend.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Planes vigentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {plans.filter((row) => row.estado === "vigente").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Alumnos cubiertos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {plans.reduce((sum, row) => sum + row.alumnos, 0).toLocaleString("es-AR")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Lotes activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lots.filter((row) => row.estado !== "cerrado").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Registros en lotes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lots.reduce((sum, row) => sum + row.registros, 0).toLocaleString("es-AR")}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle>Administracion agrupada</CardTitle>
              <CardDescription>
                Planes, generacion y lotes en una sola superficie operativa.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative w-full xl:min-w-72">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar plan, tipo, lote o responsable..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Button
                onClick={() => {
                  if (tab === "planes") openPlanDialog()
                  if (tab === "lotes") openLotDialog()
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> Nuevo registro
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
            <TabsList>
              <TabsTrigger value="planes">Planes</TabsTrigger>
              <TabsTrigger value="lotes">Lotes</TabsTrigger>
            </TabsList>

            <TabsContent value="planes" className="mt-4 grid gap-6 xl:grid-cols-[1.7fr_1fr]">
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Alumnos</TableHead>
                        <TableHead>Vigencia</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPlans.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{row.nombre}</TableCell>
                          <TableCell>{row.tipo}</TableCell>
                          <TableCell>{row.alumnos}</TableCell>
                          <TableCell>{row.vigencia}</TableCell>
                          <TableCell>{planBadge(row.estado)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => openPlanDialog(row)}>
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
                  <CardTitle>Detalle del plan</CardTitle>
                </CardHeader>
                <CardContent>
                  {highlightedPlan ? (
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{highlightedPlan.nombre}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {highlightedPlan.tipo}
                          </p>
                        </div>
                        {planBadge(highlightedPlan.estado)}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border p-3">
                          <p className="text-sm text-muted-foreground">Cuotas</p>
                          <p className="mt-2 font-medium">{highlightedPlan.cuotas}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-sm text-muted-foreground">Bonificacion</p>
                          <p className="mt-2 font-medium">{highlightedPlan.bonificacionPct}%</p>
                        </div>
                      </div>
                      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                        {highlightedPlan.observacion}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No hay planes visibles.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="lotes" className="mt-4 grid gap-6 xl:grid-cols-[1.7fr_1fr]">
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Codigo</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Periodo</TableHead>
                        <TableHead>Registros</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLots.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{row.codigo}</TableCell>
                          <TableCell>{row.tipo}</TableCell>
                          <TableCell>{row.periodo}</TableCell>
                          <TableCell>{row.registros}</TableCell>
                          <TableCell>{lotBadge(row.estado)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => openLotDialog(row)}>
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
                  <CardTitle>Detalle del lote</CardTitle>
                </CardHeader>
                <CardContent>
                  {highlightedLot ? (
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{highlightedLot.codigo}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {highlightedLot.periodo}
                          </p>
                        </div>
                        {lotBadge(highlightedLot.estado)}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border p-3">
                          <p className="text-sm text-muted-foreground">Responsable</p>
                          <p className="mt-2 font-medium">{highlightedLot.responsable}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-sm text-muted-foreground">Registros</p>
                          <p className="mt-2 font-medium">{highlightedLot.registros}</p>
                        </div>
                      </div>
                      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                        {highlightedLot.observacion}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No hay lotes visibles.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edicion de planes y lotes</DialogTitle>
            <DialogDescription>
              El formulario cambia segun el circuito activo del modulo colegio.
            </DialogDescription>
          </DialogHeader>
          {tab === "planes" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Nombre"
                value={planForm.nombre}
                onChange={(value) => setPlanForm((current) => ({ ...current, nombre: value }))}
              />
              <Field
                label="Tipo"
                value={planForm.tipo}
                onChange={(value) => setPlanForm((current) => ({ ...current, tipo: value }))}
              />
              <Field
                label="Alumnos"
                value={planForm.alumnos}
                onChange={(value) => setPlanForm((current) => ({ ...current, alumnos: value }))}
              />
              <Field
                label="Cuotas"
                value={planForm.cuotas}
                onChange={(value) => setPlanForm((current) => ({ ...current, cuotas: value }))}
              />
              <Field
                label="Bonificacion %"
                value={planForm.bonificacionPct}
                onChange={(value) =>
                  setPlanForm((current) => ({ ...current, bonificacionPct: value }))
                }
              />
              <Field
                label="Vigencia"
                value={planForm.vigencia}
                onChange={(value) => setPlanForm((current) => ({ ...current, vigencia: value }))}
              />
              <Field
                label="Estado"
                value={planForm.estado}
                onChange={(value) =>
                  setPlanForm((current) => ({
                    ...current,
                    estado: value as LegacySchoolPlan["estado"],
                  }))
                }
              />
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Observacion</label>
                <Textarea
                  value={planForm.observacion}
                  onChange={(event) =>
                    setPlanForm((current) => ({ ...current, observacion: event.target.value }))
                  }
                />
              </div>
            </div>
          ) : null}
          {tab === "lotes" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Codigo"
                value={lotForm.codigo}
                onChange={(value) => setLotForm((current) => ({ ...current, codigo: value }))}
              />
              <Field
                label="Tipo"
                value={lotForm.tipo}
                onChange={(value) => setLotForm((current) => ({ ...current, tipo: value }))}
              />
              <Field
                label="Periodo"
                value={lotForm.periodo}
                onChange={(value) => setLotForm((current) => ({ ...current, periodo: value }))}
              />
              <Field
                label="Responsable"
                value={lotForm.responsable}
                onChange={(value) => setLotForm((current) => ({ ...current, responsable: value }))}
              />
              <Field
                label="Registros"
                value={lotForm.registros}
                onChange={(value) => setLotForm((current) => ({ ...current, registros: value }))}
              />
              <Field
                label="Estado"
                value={lotForm.estado}
                onChange={(value) =>
                  setLotForm((current) => ({
                    ...current,
                    estado: value as LegacySchoolLot["estado"],
                  }))
                }
              />
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Observacion</label>
                <Textarea
                  value={lotForm.observacion}
                  onChange={(event) =>
                    setLotForm((current) => ({ ...current, observacion: event.target.value }))
                  }
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveCurrentTab}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}
