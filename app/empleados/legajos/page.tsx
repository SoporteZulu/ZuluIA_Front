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
  buildDefaultDocuments,
  buildDefaultLaborRecord,
  buildDefaultLegacyProfile,
  getDisplayName,
  getPrimaryAddress,
  getPrimaryContact,
  getRosterStatus,
  type LegacyEmployeeDocument,
  type LegacyEmployeeLaborRecord,
  useLegacyEmployeeDocuments,
  useLegacyEmployeeLaborRecords,
  useLegacyEmployeeProfiles,
} from "@/lib/empleados-legacy"
import { useEmpleados } from "@/lib/hooks/useEmpleados"
import { useSucursales } from "@/lib/hooks/useSucursales"
import type { Empleado } from "@/lib/types/empleados"

type LaborFormState = LegacyEmployeeLaborRecord

type DocumentFormState = LegacyEmployeeDocument

const emptyDocument: DocumentFormState = {
  id: "",
  tipo: "",
  numero: "",
  emisor: "",
  fechaEmision: "",
  fechaVencimiento: "",
  estado: "pendiente",
  observacion: "",
}

export default function EmpleadosLegajosPage() {
  const { empleados, loading, search, setSearch } = useEmpleados()
  const { sucursales } = useSucursales(false)
  const [profiles] = useLegacyEmployeeProfiles()
  const [laborRecords, setLaborRecords] = useLegacyEmployeeLaborRecords()
  const [documentsMap, setDocumentsMap] = useLegacyEmployeeDocuments()
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null)
  const [isLaborDialogOpen, setIsLaborDialogOpen] = useState(false)
  const [isDocumentDialogOpen, setIsDocumentDialogOpen] = useState(false)
  const [laborForm, setLaborForm] = useState<LaborFormState | null>(null)
  const [documentForm, setDocumentForm] = useState<DocumentFormState>(emptyDocument)

  const merged = useMemo(
    () =>
      empleados.map((empleado) => ({
        empleado,
        profile: profiles[String(empleado.id)] ?? buildDefaultLegacyProfile(empleado),
        labor: laborRecords[String(empleado.id)] ?? buildDefaultLaborRecord(empleado),
        documents: documentsMap[String(empleado.id)] ?? buildDefaultDocuments(empleado),
      })),
    [documentsMap, empleados, laborRecords, profiles]
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return merged.filter(({ empleado, profile, labor }) => {
      return (
        !term ||
        getDisplayName(empleado, profile).toLowerCase().includes(term) ||
        (empleado.legajo ?? "").toLowerCase().includes(term) ||
        (profile.nroDocumento ?? "").toLowerCase().includes(term) ||
        labor.puesto.toLowerCase().includes(term)
      )
    })
  }, [merged, search])

  const selected =
    filtered.find(({ empleado }) => empleado.id === selectedEmployeeId) ?? filtered[0] ?? null
  const sucursalMap = new Map(sucursales.map((item) => [item.id, item.descripcion]))
  const completeFiles = filtered.filter(
    ({ empleado, profile, documents }) =>
      getRosterStatus(empleado, profile) === "Completo" && documents.length > 0
  ).length

  function openLaborDialog(empleado: Empleado) {
    setLaborForm(laborRecords[String(empleado.id)] ?? buildDefaultLaborRecord(empleado))
    setSelectedEmployeeId(empleado.id)
    setIsLaborDialogOpen(true)
  }

  function saveLabor() {
    if (!selected || !laborForm) {
      return
    }

    setLaborRecords((current) => ({
      ...current,
      [String(selected.empleado.id)]: laborForm,
    }))
    setIsLaborDialogOpen(false)
  }

  function openDocumentDialog(empleado: Empleado, document?: LegacyEmployeeDocument) {
    setSelectedEmployeeId(empleado.id)
    setDocumentForm(
      document ?? {
        ...emptyDocument,
        id: globalThis.crypto.randomUUID(),
      }
    )
    setIsDocumentDialogOpen(true)
  }

  function saveDocument() {
    if (!selected) {
      return
    }

    setDocumentsMap((current) => {
      const key = String(selected.empleado.id)
      const existing = current[key] ?? buildDefaultDocuments(selected.empleado)
      const alreadyExists = existing.some((item) => item.id === documentForm.id)
      return {
        ...current,
        [key]: alreadyExists
          ? existing.map((item) => (item.id === documentForm.id ? documentForm : item))
          : [documentForm, ...existing],
      }
    })
    setIsDocumentDialogOpen(false)
  }

  function removeDocument(employeeId: number, documentId: string) {
    setDocumentsMap((current) => {
      const key = String(employeeId)
      const next = (current[key] ?? []).filter((item) => item.id !== documentId)
      return {
        ...current,
        [key]: next,
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Empleados: Legajos</h1>
        <p className="mt-1 text-muted-foreground">
          Superficie dedicada a la paridad de `frmEmpleado`: identidad, ubicación, fiscal,
          documentación y datos laborales complementarios. La API actual sólo cubre el núcleo del
          legajo; el resto queda como overlay local explícito.
        </p>
      </div>

      <Alert>
        <AlertTitle>Legajo mixto</AlertTitle>
        <AlertDescription>
          Se reutiliza el maestro real de empleados y el overlay local del dashboard actual. Los
          bloques de documentación y RRHH extendido siguen en persistencia local hasta exponer
          backend específico.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Legajos visibles"
          value={loading ? "..." : filtered.length}
          description="Dotación filtrada actualmente"
        />
        <MetricCard
          title="Legajos completos"
          value={completeFiles}
          description="Con núcleo API y documentación visible"
        />
        <MetricCard
          title="Documentos"
          value={filtered.reduce((sum, row) => sum + row.documents.length, 0)}
          description="Referencias documentales locales"
        />
        <MetricCard
          title="Con datos bancarios"
          value={filtered.filter((row) => row.labor.cbu.trim()).length}
          description="CBU / banco informados en overlay RRHH"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <CardTitle>Padron de legajos</CardTitle>
                <CardDescription>
                  Filtrá y elegí una ficha para revisar el reemplazo del legacy.
                </CardDescription>
              </div>
              <div className="relative min-w-72">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por nombre, documento, legajo o puesto..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Legajo</TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Puesto</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Ficha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(({ empleado, profile, labor, documents }) => (
                  <TableRow
                    key={empleado.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedEmployeeId(empleado.id)}
                  >
                    <TableCell className="font-medium">{empleado.legajo ?? "-"}</TableCell>
                    <TableCell>{getDisplayName(empleado, profile)}</TableCell>
                    <TableCell>{labor.puesto}</TableCell>
                    <TableCell>
                      {sucursalMap.get(empleado.sucursalId) ?? `Sucursal ${empleado.sucursalId}`}
                    </TableCell>
                    <TableCell>
                      <Badge variant={empleado.estado === "activo" ? "default" : "outline"}>
                        {empleado.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          getRosterStatus(empleado, profile) === "Completo"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {getRosterStatus(empleado, profile)} · {documents.length} docs
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openLaborDialog(empleado)}>
                          <PencilLine className="mr-2 h-4 w-4" /> Laboral
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDocumentDialog(empleado)}
                        >
                          <Plus className="mr-2 h-4 w-4" /> Documento
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ficha seleccionada</CardTitle>
            <CardDescription>Resumen operativo del reemplazo de `frmEmpleado`.</CardDescription>
          </CardHeader>
          <CardContent>
            {selected ? (
              <Tabs defaultValue="resumen" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="resumen">Resumen</TabsTrigger>
                  <TabsTrigger value="laboral">Laboral</TabsTrigger>
                  <TabsTrigger value="documentos">Docs</TabsTrigger>
                </TabsList>
                <TabsContent value="resumen" className="space-y-4">
                  <InfoBlock
                    label="Empleado"
                    value={getDisplayName(selected.empleado, selected.profile)}
                  />
                  <InfoBlock
                    label="Documento"
                    value={`${selected.profile.tipoDocumento} ${selected.profile.nroDocumento || "-"}`}
                  />
                  <InfoBlock
                    label="Contacto principal"
                    value={getPrimaryContact(selected.profile)?.valor || "Sin contacto"}
                  />
                  <InfoBlock
                    label="Domicilio principal"
                    value={
                      [
                        getPrimaryAddress(selected.profile)?.calle,
                        getPrimaryAddress(selected.profile)?.numero,
                        getPrimaryAddress(selected.profile)?.ciudad,
                      ]
                        .filter(Boolean)
                        .join(" ") || "Sin domicilio"
                    }
                  />
                  <InfoBlock
                    label="Fiscal"
                    value={selected.profile.condicionFiscal || "Sin dato"}
                  />
                  <InfoBlock
                    label="Observación"
                    value={selected.profile.observacion || "Sin observaciones"}
                  />
                </TabsContent>
                <TabsContent value="laboral" className="space-y-4">
                  <InfoBlock label="Puesto" value={selected.labor.puesto} />
                  <InfoBlock label="Modalidad" value={selected.labor.modalidad} />
                  <InfoBlock label="Convenio" value={selected.labor.convenio} />
                  <InfoBlock label="Supervisor" value={selected.labor.supervisor} />
                  <InfoBlock label="Obra social" value={selected.labor.obraSocial} />
                  <InfoBlock
                    label="Banco / CBU"
                    value={`${selected.labor.banco || "Sin banco"} · ${selected.labor.cbu || "Sin CBU"}`}
                  />
                  <InfoBlock
                    label="Fechas clave"
                    value={`Alta ${selected.labor.fechaAlta || "-"} · Antigüedad ${selected.labor.fechaAntiguedad || "-"}`}
                  />
                </TabsContent>
                <TabsContent value="documentos" className="space-y-3">
                  {selected.documents.map((document) => (
                    <div key={document.id} className="rounded-lg border p-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{document.tipo}</p>
                          <p className="mt-1 text-muted-foreground">
                            {document.numero || "Sin número"}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDocument(selected.empleado.id, document.id)}
                        >
                          Quitar
                        </Button>
                      </div>
                      <p className="mt-2 text-muted-foreground">
                        {document.observacion || "Sin observación"}
                      </p>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            ) : (
              <p className="text-sm text-muted-foreground">No hay legajo seleccionado.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isLaborDialogOpen} onOpenChange={setIsLaborDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Datos laborales complementarios</DialogTitle>
            <DialogDescription>
              Bloque local para cubrir fechas clave, banco, obra social, convenio y jornada del
              legajo legacy.
            </DialogDescription>
          </DialogHeader>
          {laborForm ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Puesto"
                value={laborForm.puesto}
                onChange={(value) =>
                  setLaborForm((current) => (current ? { ...current, puesto: value } : current))
                }
              />
              <Field
                label="Modalidad"
                value={laborForm.modalidad}
                onChange={(value) =>
                  setLaborForm((current) => (current ? { ...current, modalidad: value } : current))
                }
              />
              <Field
                label="Convenio"
                value={laborForm.convenio}
                onChange={(value) =>
                  setLaborForm((current) => (current ? { ...current, convenio: value } : current))
                }
              />
              <Field
                label="Jornada"
                value={laborForm.jornada}
                onChange={(value) =>
                  setLaborForm((current) => (current ? { ...current, jornada: value } : current))
                }
              />
              <Field
                label="Horas semanales"
                value={String(laborForm.horasSemanales)}
                onChange={(value) =>
                  setLaborForm((current) =>
                    current ? { ...current, horasSemanales: Number(value) || 0 } : current
                  )
                }
              />
              <Field
                label="Supervisor"
                value={laborForm.supervisor}
                onChange={(value) =>
                  setLaborForm((current) => (current ? { ...current, supervisor: value } : current))
                }
              />
              <Field
                label="Centro de costo"
                value={laborForm.centroCosto}
                onChange={(value) =>
                  setLaborForm((current) =>
                    current ? { ...current, centroCosto: value } : current
                  )
                }
              />
              <Field
                label="Obra social"
                value={laborForm.obraSocial}
                onChange={(value) =>
                  setLaborForm((current) => (current ? { ...current, obraSocial: value } : current))
                }
              />
              <Field
                label="ART"
                value={laborForm.art}
                onChange={(value) =>
                  setLaborForm((current) => (current ? { ...current, art: value } : current))
                }
              />
              <Field
                label="Sindicato"
                value={laborForm.sindicato}
                onChange={(value) =>
                  setLaborForm((current) => (current ? { ...current, sindicato: value } : current))
                }
              />
              <Field
                label="Banco"
                value={laborForm.banco}
                onChange={(value) =>
                  setLaborForm((current) => (current ? { ...current, banco: value } : current))
                }
              />
              <Field
                label="CBU"
                value={laborForm.cbu}
                onChange={(value) =>
                  setLaborForm((current) => (current ? { ...current, cbu: value } : current))
                }
              />
              <Field
                label="Alias bancario"
                value={laborForm.aliasBancario}
                onChange={(value) =>
                  setLaborForm((current) =>
                    current ? { ...current, aliasBancario: value } : current
                  )
                }
              />
              <Field
                label="Fecha alta"
                value={laborForm.fechaAlta}
                onChange={(value) =>
                  setLaborForm((current) => (current ? { ...current, fechaAlta: value } : current))
                }
              />
              <Field
                label="Fecha antigüedad"
                value={laborForm.fechaAntiguedad}
                onChange={(value) =>
                  setLaborForm((current) =>
                    current ? { ...current, fechaAntiguedad: value } : current
                  )
                }
              />
              <Field
                label="Último ascenso"
                value={laborForm.fechaUltimoAscenso}
                onChange={(value) =>
                  setLaborForm((current) =>
                    current ? { ...current, fechaUltimoAscenso: value } : current
                  )
                }
              />
              <Field
                label="Fecha baja"
                value={laborForm.fechaBaja}
                onChange={(value) =>
                  setLaborForm((current) => (current ? { ...current, fechaBaja: value } : current))
                }
              />
              <Field
                label="Apto médico"
                value={laborForm.fechaAptoMedico}
                onChange={(value) =>
                  setLaborForm((current) =>
                    current ? { ...current, fechaAptoMedico: value } : current
                  )
                }
              />
              <Field
                label="Vencimiento carnet"
                value={laborForm.fechaVencimientoCarnet}
                onChange={(value) =>
                  setLaborForm((current) =>
                    current ? { ...current, fechaVencimientoCarnet: value } : current
                  )
                }
              />
              <div className="space-y-2">
                <Label>Estado nómina</Label>
                <Select
                  value={laborForm.estadoNomina}
                  onValueChange={(value) =>
                    setLaborForm((current) =>
                      current
                        ? {
                            ...current,
                            estadoNomina: value as LegacyEmployeeLaborRecord["estadoNomina"],
                          }
                        : current
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="licencia">Licencia</SelectItem>
                    <SelectItem value="suspendido">Suspendido</SelectItem>
                    <SelectItem value="egresado">Egresado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Field
                label="Sueldo variable"
                value={String(laborForm.sueldoVariable)}
                onChange={(value) =>
                  setLaborForm((current) =>
                    current ? { ...current, sueldoVariable: Number(value) || 0 } : current
                  )
                }
              />
              <Field
                label="Plus no remunerativo"
                value={String(laborForm.plusNoRemunerativo)}
                onChange={(value) =>
                  setLaborForm((current) =>
                    current ? { ...current, plusNoRemunerativo: Number(value) || 0 } : current
                  )
                }
              />
              <div className="space-y-2 sm:col-span-2">
                <Label>Notas</Label>
                <Textarea
                  value={laborForm.notas}
                  onChange={(event) =>
                    setLaborForm((current) =>
                      current ? { ...current, notas: event.target.value } : current
                    )
                  }
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLaborDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveLabor}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDocumentDialogOpen} onOpenChange={setIsDocumentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Documento del legajo</DialogTitle>
            <DialogDescription>
              Referencia documental local para cubrir el bloque de documentación faltante.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Field
              label="Tipo"
              value={documentForm.tipo}
              onChange={(value) => setDocumentForm((current) => ({ ...current, tipo: value }))}
            />
            <Field
              label="Número"
              value={documentForm.numero}
              onChange={(value) => setDocumentForm((current) => ({ ...current, numero: value }))}
            />
            <Field
              label="Emisor"
              value={documentForm.emisor}
              onChange={(value) => setDocumentForm((current) => ({ ...current, emisor: value }))}
            />
            <Field
              label="Fecha emisión"
              value={documentForm.fechaEmision}
              onChange={(value) =>
                setDocumentForm((current) => ({ ...current, fechaEmision: value }))
              }
            />
            <Field
              label="Fecha vencimiento"
              value={documentForm.fechaVencimiento}
              onChange={(value) =>
                setDocumentForm((current) => ({ ...current, fechaVencimiento: value }))
              }
            />
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={documentForm.estado}
                onValueChange={(value) =>
                  setDocumentForm((current) => ({
                    ...current,
                    estado: value as LegacyEmployeeDocument["estado"],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vigente">Vigente</SelectItem>
                  <SelectItem value="a-vencer">A vencer</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observación</Label>
              <Textarea
                value={documentForm.observacion}
                onChange={(event) =>
                  setDocumentForm((current) => ({ ...current, observacion: event.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDocumentDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveDocument}>Guardar documento</Button>
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
