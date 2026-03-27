"use client"

import { useMemo, useState } from "react"
import { CalendarRange, PencilLine, Plus, Search } from "lucide-react"

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
import {
  buildDefaultLaborRecord,
  buildDefaultLeaves,
  buildDefaultLegacyProfile,
  buildDefaultPayrollLiquidations,
  getDisplayName,
  type LegacyEmployeeLeaveRecord,
  type LegacyPayrollConcept,
  type LegacyPayrollLiquidation,
  useLegacyEmployeeLaborRecords,
  useLegacyEmployeeLeaves,
  useLegacyEmployeePayroll,
  useLegacyEmployeeProfiles,
} from "@/lib/empleados-legacy"
import { useEmpleados } from "@/lib/hooks/useEmpleados"

type LiquidationFormState = LegacyPayrollLiquidation & {
  employeeId: string
}

type LeaveFormState = LegacyEmployeeLeaveRecord & {
  employeeId: string
}

function newConcept(): LegacyPayrollConcept {
  return {
    id: globalThis.crypto.randomUUID(),
    concepto: "",
    tipo: "haber",
    importe: 0,
  }
}

export default function EmpleadosLiquidacionesPage() {
  const { empleados, search, setSearch } = useEmpleados()
  const [profiles] = useLegacyEmployeeProfiles()
  const [laborRecords] = useLegacyEmployeeLaborRecords()
  const [leaveMap, setLeaveMap] = useLegacyEmployeeLeaves()
  const [payrollMap, setPayrollMap] = useLegacyEmployeePayroll()
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null)
  const [isLiquidationDialogOpen, setIsLiquidationDialogOpen] = useState(false)
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false)
  const [liquidationForm, setLiquidationForm] = useState<LiquidationFormState | null>(null)
  const [leaveForm, setLeaveForm] = useState<LeaveFormState | null>(null)

  const merged = useMemo(
    () =>
      empleados.map((empleado) => {
        const profile = profiles[String(empleado.id)] ?? buildDefaultLegacyProfile(empleado)
        const labor = laborRecords[String(empleado.id)] ?? buildDefaultLaborRecord(empleado)
        const liquidations =
          payrollMap[String(empleado.id)] ?? buildDefaultPayrollLiquidations(empleado, labor)
        const leaves = leaveMap[String(empleado.id)] ?? buildDefaultLeaves()

        return {
          empleado,
          profile,
          labor,
          liquidations,
          leaves,
        }
      }),
    [empleados, leaveMap, laborRecords, payrollMap, profiles]
  )

  const filteredEmployees = useMemo(() => {
    const term = search.trim().toLowerCase()
    return merged.filter(({ empleado, profile }) => {
      return (
        !term ||
        getDisplayName(empleado, profile).toLowerCase().includes(term) ||
        (empleado.legajo ?? "").toLowerCase().includes(term)
      )
    })
  }, [merged, search])

  const selected =
    filteredEmployees.find(({ empleado }) => empleado.id === selectedEmployeeId) ??
    filteredEmployees[0] ??
    null

  const flatLiquidations = filteredEmployees.flatMap(({ empleado, profile, liquidations }) =>
    liquidations.map((liquidation) => ({
      employeeId: empleado.id,
      employeeName: getDisplayName(empleado, profile),
      employeeLegajo: empleado.legajo ?? "-",
      liquidation,
    }))
  )

  function openLiquidationDialog(employeeId?: number, liquidation?: LegacyPayrollLiquidation) {
    const targetEmployee =
      merged.find(({ empleado }) => empleado.id === (employeeId ?? selected?.empleado.id)) ?? null
    if (!targetEmployee) {
      return
    }

    const base =
      liquidation ??
      buildDefaultPayrollLiquidations(targetEmployee.empleado, targetEmployee.labor)[0]

    setLiquidationForm({
      ...base,
      employeeId: String(targetEmployee.empleado.id),
      conceptos: base.conceptos.map((item) => ({ ...item })),
    })
    setSelectedEmployeeId(targetEmployee.empleado.id)
    setIsLiquidationDialogOpen(true)
  }

  function saveLiquidation() {
    if (!liquidationForm) {
      return
    }

    const employeeKey = liquidationForm.employeeId
    const payload: LegacyPayrollLiquidation = {
      ...liquidationForm,
      bruto: Number(liquidationForm.bruto),
      descuentos: Number(liquidationForm.descuentos),
      neto: Number(liquidationForm.neto),
      conceptos: liquidationForm.conceptos.map((item) => ({
        ...item,
        importe: Number(item.importe),
      })),
    }

    setPayrollMap((current) => {
      const existing = current[employeeKey] ?? []
      const alreadyExists = existing.some((item) => item.id === payload.id)
      return {
        ...current,
        [employeeKey]: alreadyExists
          ? existing.map((item) => (item.id === payload.id ? payload : item))
          : [payload, ...existing],
      }
    })
    setIsLiquidationDialogOpen(false)
  }

  function openLeaveDialog(employeeId?: number, leave?: LegacyEmployeeLeaveRecord) {
    const targetEmployee =
      merged.find(({ empleado }) => empleado.id === (employeeId ?? selected?.empleado.id)) ?? null
    if (!targetEmployee) {
      return
    }

    setLeaveForm({
      ...(leave ?? {
        id: globalThis.crypto.randomUUID(),
        tipo: "vacaciones",
        desde: "",
        hasta: "",
        estado: "planificado",
        observacion: "",
      }),
      employeeId: String(targetEmployee.empleado.id),
    })
    setSelectedEmployeeId(targetEmployee.empleado.id)
    setIsLeaveDialogOpen(true)
  }

  function saveLeave() {
    if (!leaveForm) {
      return
    }

    const employeeKey = leaveForm.employeeId
    const payload: LegacyEmployeeLeaveRecord = {
      id: leaveForm.id,
      tipo: leaveForm.tipo,
      desde: leaveForm.desde,
      hasta: leaveForm.hasta,
      estado: leaveForm.estado,
      observacion: leaveForm.observacion,
    }

    setLeaveMap((current) => {
      const existing = current[employeeKey] ?? []
      const alreadyExists = existing.some((item) => item.id === payload.id)
      return {
        ...current,
        [employeeKey]: alreadyExists
          ? existing.map((item) => (item.id === payload.id ? payload : item))
          : [payload, ...existing],
      }
    })
    setIsLeaveDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Empleados: Nómina y Liquidaciones</h1>
        <p className="mt-1 text-muted-foreground">
          Reemplazo operativo de `frmSueldos`: liquidaciones, conceptos, recibos y novedades de
          ausentismo. Se apoya en empleados reales y completa el resto con cobertura local honesta.
        </p>
      </div>

      <Alert>
        <AlertTitle>Nómina sin contrato backend</AlertTitle>
        <AlertDescription>
          La API actual sólo publica sueldo básico en el legajo. Esta vista cubre liquidación,
          conceptos, recibos y vacaciones/licencias de forma local y explícita.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Liquidaciones visibles"
          value={flatLiquidations.length}
          description="Mensuales, SAC, vacaciones y ajustes"
        />
        <MetricCard
          title="Neto visible"
          value={`$${flatLiquidations.reduce((sum, row) => sum + row.liquidation.neto, 0).toLocaleString("es-AR")}`}
          description="Suma de liquidaciones del filtro actual"
        />
        <MetricCard
          title="Pagadas"
          value={flatLiquidations.filter((row) => row.liquidation.estado === "pagado").length}
          description="Comprobantes con pago registrado"
        />
        <MetricCard
          title="Novedades RRHH"
          value={filteredEmployees.reduce((sum, row) => sum + row.leaves.length, 0)}
          description="Vacaciones, licencias y ausencias"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <CardTitle>Liquidaciones por empleado</CardTitle>
                <CardDescription>
                  Consulta y mantenimiento del circuito de sueldos legado.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative min-w-72">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar por empleado o legajo..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
                <Button onClick={() => openLiquidationDialog()}>
                  <Plus className="mr-2 h-4 w-4" /> Nueva liquidación
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Neto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flatLiquidations.map((row) => (
                  <TableRow
                    key={row.liquidation.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedEmployeeId(row.employeeId)}
                  >
                    <TableCell className="font-medium">{row.employeeName}</TableCell>
                    <TableCell>{row.liquidation.periodo}</TableCell>
                    <TableCell>{row.liquidation.tipo}</TableCell>
                    <TableCell>${row.liquidation.neto.toLocaleString("es-AR")}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          row.liquidation.estado === "pagado"
                            ? "secondary"
                            : row.liquidation.estado === "liquidado"
                              ? "default"
                              : "outline"
                        }
                      >
                        {row.liquidation.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openLiquidationDialog(row.employeeId, row.liquidation)}
                      >
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
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Detalle y novedades</CardTitle>
                <CardDescription>
                  Recibos, conceptos y ausentismo del empleado seleccionado.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openLeaveDialog()}
                disabled={!selected}
              >
                <CalendarRange className="mr-2 h-4 w-4" /> Novedad
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {selected ? (
              <Tabs defaultValue="liquidaciones" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="liquidaciones">Liquidaciones</TabsTrigger>
                  <TabsTrigger value="novedades">Novedades</TabsTrigger>
                </TabsList>
                <TabsContent value="liquidaciones" className="space-y-4">
                  <InfoBlock
                    label="Empleado"
                    value={getDisplayName(selected.empleado, selected.profile)}
                  />
                  <InfoBlock
                    label="Puesto / modalidad"
                    value={`${selected.labor.puesto} · ${selected.labor.modalidad}`}
                  />
                  {selected.liquidations.map((liquidation) => (
                    <div key={liquidation.id} className="rounded-lg border p-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">
                            {liquidation.periodo} · {liquidation.tipo}
                          </p>
                          <p className="mt-1 text-muted-foreground">
                            Recibo {liquidation.reciboNumero || "Sin numerar"}
                          </p>
                        </div>
                        <Badge
                          variant={
                            liquidation.estado === "pagado"
                              ? "secondary"
                              : liquidation.estado === "liquidado"
                                ? "default"
                                : "outline"
                          }
                        >
                          {liquidation.estado}
                        </Badge>
                      </div>
                      <div className="mt-3 grid gap-2">
                        {liquidation.conceptos.map((concept) => (
                          <div
                            key={concept.id}
                            className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2"
                          >
                            <span>{concept.concepto}</span>
                            <span>${concept.importe.toLocaleString("es-AR")}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </TabsContent>
                <TabsContent value="novedades" className="space-y-3">
                  {selected.leaves.map((leave) => (
                    <div key={leave.id} className="rounded-lg border p-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{leave.tipo}</p>
                          <p className="mt-1 text-muted-foreground">
                            {leave.desde || "Sin inicio"} a {leave.hasta || "Sin fin"}
                          </p>
                        </div>
                        <Badge
                          variant={
                            leave.estado === "cerrado"
                              ? "secondary"
                              : leave.estado === "en-curso"
                                ? "default"
                                : "outline"
                          }
                        >
                          {leave.estado}
                        </Badge>
                      </div>
                      <p className="mt-2 text-muted-foreground">
                        {leave.observacion || "Sin observación"}
                      </p>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            ) : (
              <p className="text-sm text-muted-foreground">No hay empleado seleccionado.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isLiquidationDialogOpen} onOpenChange={setIsLiquidationDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Liquidación de sueldos</DialogTitle>
            <DialogDescription>
              Cobertura local del formulario legacy de sueldos, con conceptos y recibo visible.
            </DialogDescription>
          </DialogHeader>
          {liquidationForm ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Empleado</Label>
                  <Select
                    value={liquidationForm.employeeId}
                    onValueChange={(value) =>
                      setLiquidationForm((current) =>
                        current ? { ...current, employeeId: value } : current
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {merged.map((row) => (
                        <SelectItem key={row.empleado.id} value={String(row.empleado.id)}>
                          {getDisplayName(row.empleado, row.profile)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Field
                  label="Período"
                  value={liquidationForm.periodo}
                  onChange={(value) =>
                    setLiquidationForm((current) =>
                      current ? { ...current, periodo: value } : current
                    )
                  }
                />
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={liquidationForm.tipo}
                    onValueChange={(value) =>
                      setLiquidationForm((current) =>
                        current
                          ? { ...current, tipo: value as LegacyPayrollLiquidation["tipo"] }
                          : current
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensual">Mensual</SelectItem>
                      <SelectItem value="sac">SAC</SelectItem>
                      <SelectItem value="vacaciones">Vacaciones</SelectItem>
                      <SelectItem value="liquidacion-final">Liquidación final</SelectItem>
                      <SelectItem value="ajuste">Ajuste</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Field
                  label="Fecha liquidación"
                  value={liquidationForm.fechaLiquidacion}
                  onChange={(value) =>
                    setLiquidationForm((current) =>
                      current ? { ...current, fechaLiquidacion: value } : current
                    )
                  }
                />
                <Field
                  label="Fecha pago"
                  value={liquidationForm.fechaPago}
                  onChange={(value) =>
                    setLiquidationForm((current) =>
                      current ? { ...current, fechaPago: value } : current
                    )
                  }
                />
                <Field
                  label="Bruto"
                  value={String(liquidationForm.bruto)}
                  onChange={(value) =>
                    setLiquidationForm((current) =>
                      current ? { ...current, bruto: Number(value) || 0 } : current
                    )
                  }
                />
                <Field
                  label="Descuentos"
                  value={String(liquidationForm.descuentos)}
                  onChange={(value) =>
                    setLiquidationForm((current) =>
                      current ? { ...current, descuentos: Number(value) || 0 } : current
                    )
                  }
                />
                <Field
                  label="Neto"
                  value={String(liquidationForm.neto)}
                  onChange={(value) =>
                    setLiquidationForm((current) =>
                      current ? { ...current, neto: Number(value) || 0 } : current
                    )
                  }
                />
                <Field
                  label="Recibo"
                  value={liquidationForm.reciboNumero}
                  onChange={(value) =>
                    setLiquidationForm((current) =>
                      current ? { ...current, reciboNumero: value } : current
                    )
                  }
                />
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select
                    value={liquidationForm.estado}
                    onValueChange={(value) =>
                      setLiquidationForm((current) =>
                        current
                          ? { ...current, estado: value as LegacyPayrollLiquidation["estado"] }
                          : current
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="borrador">Borrador</SelectItem>
                      <SelectItem value="liquidado">Liquidado</SelectItem>
                      <SelectItem value="pagado">Pagado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Conceptos</p>
                    <p className="text-sm text-muted-foreground">Haber, descuento o aporte.</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setLiquidationForm((current) =>
                        current
                          ? { ...current, conceptos: [...current.conceptos, newConcept()] }
                          : current
                      )
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" /> Concepto
                  </Button>
                </div>
                <div className="space-y-3">
                  {liquidationForm.conceptos.map((concept) => (
                    <div
                      key={concept.id}
                      className="grid gap-3 sm:grid-cols-[1.4fr_0.8fr_0.8fr_auto]"
                    >
                      <Input
                        value={concept.concepto}
                        onChange={(event) =>
                          setLiquidationForm((current) =>
                            current
                              ? {
                                  ...current,
                                  conceptos: current.conceptos.map((item) =>
                                    item.id === concept.id
                                      ? { ...item, concepto: event.target.value }
                                      : item
                                  ),
                                }
                              : current
                          )
                        }
                        placeholder="Concepto"
                      />
                      <Select
                        value={concept.tipo}
                        onValueChange={(value) =>
                          setLiquidationForm((current) =>
                            current
                              ? {
                                  ...current,
                                  conceptos: current.conceptos.map((item) =>
                                    item.id === concept.id
                                      ? { ...item, tipo: value as LegacyPayrollConcept["tipo"] }
                                      : item
                                  ),
                                }
                              : current
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="haber">Haber</SelectItem>
                          <SelectItem value="descuento">Descuento</SelectItem>
                          <SelectItem value="aporte">Aporte</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={String(concept.importe)}
                        onChange={(event) =>
                          setLiquidationForm((current) =>
                            current
                              ? {
                                  ...current,
                                  conceptos: current.conceptos.map((item) =>
                                    item.id === concept.id
                                      ? { ...item, importe: Number(event.target.value) || 0 }
                                      : item
                                  ),
                                }
                              : current
                          )
                        }
                        placeholder="Importe"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setLiquidationForm((current) =>
                            current
                              ? {
                                  ...current,
                                  conceptos: current.conceptos.filter(
                                    (item) => item.id !== concept.id
                                  ),
                                }
                              : current
                          )
                        }
                      >
                        Quitar
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Observación</Label>
                <Textarea
                  value={liquidationForm.observacion}
                  onChange={(event) =>
                    setLiquidationForm((current) =>
                      current ? { ...current, observacion: event.target.value } : current
                    )
                  }
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLiquidationDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveLiquidation}>Guardar liquidación</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novedad RRHH</DialogTitle>
            <DialogDescription>
              Vacaciones, licencias, ausencias o accidentes del legajo.
            </DialogDescription>
          </DialogHeader>
          {leaveForm ? (
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Empleado</Label>
                <Select
                  value={leaveForm.employeeId}
                  onValueChange={(value) =>
                    setLeaveForm((current) =>
                      current ? { ...current, employeeId: value } : current
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {merged.map((row) => (
                      <SelectItem key={row.empleado.id} value={String(row.empleado.id)}>
                        {getDisplayName(row.empleado, row.profile)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={leaveForm.tipo}
                  onValueChange={(value) =>
                    setLeaveForm((current) =>
                      current
                        ? { ...current, tipo: value as LegacyEmployeeLeaveRecord["tipo"] }
                        : current
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vacaciones">Vacaciones</SelectItem>
                    <SelectItem value="licencia">Licencia</SelectItem>
                    <SelectItem value="ausencia">Ausencia</SelectItem>
                    <SelectItem value="accidente">Accidente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Field
                label="Desde"
                value={leaveForm.desde}
                onChange={(value) =>
                  setLeaveForm((current) => (current ? { ...current, desde: value } : current))
                }
              />
              <Field
                label="Hasta"
                value={leaveForm.hasta}
                onChange={(value) =>
                  setLeaveForm((current) => (current ? { ...current, hasta: value } : current))
                }
              />
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={leaveForm.estado}
                  onValueChange={(value) =>
                    setLeaveForm((current) =>
                      current
                        ? { ...current, estado: value as LegacyEmployeeLeaveRecord["estado"] }
                        : current
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planificado">Planificado</SelectItem>
                    <SelectItem value="en-curso">En curso</SelectItem>
                    <SelectItem value="cerrado">Cerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Observación</Label>
                <Textarea
                  value={leaveForm.observacion}
                  onChange={(event) =>
                    setLeaveForm((current) =>
                      current ? { ...current, observacion: event.target.value } : current
                    )
                  }
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLeaveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveLeave}>Guardar novedad</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MetricCard({
  title,
  value,
  description,
}: {
  title: string
  value: string | number
  description: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-medium">{value}</p>
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
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}
