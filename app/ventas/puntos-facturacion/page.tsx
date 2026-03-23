"use client"

import { useCallback, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  MapPin,
  Eye,
  CheckCircle,
  XCircle,
  Plus,
  Edit,
  Search,
  ReceiptText,
  Landmark,
  AlertCircle,
} from "lucide-react"
import { usePuntosFacturacion, useTiposPuntoFacturacion } from "@/lib/hooks/usePuntosFacturacion"
import { useSucursales } from "@/lib/hooks/useSucursales"
import type { CreatePuntoFacturacionDto, PuntoFacturacion } from "@/lib/types/puntos-facturacion"

const EMPTY_FORM: CreatePuntoFacturacionDto = {
  sucursalId: 0,
  numero: 0,
  descripcion: "",
  tipoPuntoFacturacionId: 0,
}

function getOperationalStatus(punto: PuntoFacturacion) {
  if (!punto.activo) return "Punto inactivo"
  return "Punto disponible para emisión"
}

function getNumberingStatus(
  nextNumber: number | null,
  loadingNextNumber: boolean,
  punto: PuntoFacturacion
) {
  if (!punto.activo) return "Numeración detenida por baja"
  if (loadingNextNumber) return "Consultando numeración"
  if (nextNumber === null) return "Sin numeración consultada"
  return `Próximo comprobante ${nextNumber}`
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

interface PuntoFormProps {
  punto: PuntoFacturacion | null
  sucursalId?: number
  onClose: () => void
  onSaved: () => void
}

function createPuntoFormState(
  punto: PuntoFacturacion | null,
  sucursalId: number | undefined,
  tipos: Array<{ id: number; descripcion: string; porDefecto: boolean }>
): CreatePuntoFacturacionDto {
  if (punto) {
    return {
      sucursalId: punto.sucursalId,
      numero: punto.numero,
      descripcion: punto.descripcion,
      tipoPuntoFacturacionId: punto.tipoPuntoFacturacionId ?? 0,
    }
  }

  return {
    ...EMPTY_FORM,
    sucursalId: sucursalId ?? 0,
    tipoPuntoFacturacionId: tipos.find((tipo) => tipo.porDefecto)?.id ?? tipos[0]?.id ?? 0,
  }
}

function PuntoForm({ punto, sucursalId, onClose, onSaved }: PuntoFormProps) {
  const { tipos } = useTiposPuntoFacturacion()
  const { crear, actualizar } = usePuntosFacturacion(sucursalId)
  const [form, setForm] = useState<CreatePuntoFacturacionDto>(() =>
    createPuntoFormState(punto, sucursalId, tipos)
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (key: keyof CreatePuntoFacturacionDto, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const selectedTipo = tipos.find((tipo) => tipo.id === form.tipoPuntoFacturacionId)

  const handleSave = async () => {
    if (
      !form.sucursalId ||
      !form.numero ||
      !form.descripcion.trim() ||
      !form.tipoPuntoFacturacionId
    ) {
      setError("Sucursal, número, descripción y tipo son obligatorios")
      return
    }

    setSaving(true)
    setError(null)
    const ok = punto
      ? await actualizar(punto.id, {
          descripcion: form.descripcion,
          tipoPuntoFacturacionId: form.tipoPuntoFacturacionId,
        })
      : await crear(form)
    setSaving(false)

    if (ok) onSaved()
    else setError("No se pudo guardar el punto de facturación")
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="principal" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-3">
          <TabsTrigger value="principal" className="py-2 text-xs">
            Principal
          </TabsTrigger>
          <TabsTrigger value="emision" className="py-2 text-xs">
            Emisión
          </TabsTrigger>
          <TabsTrigger value="legado" className="py-2 text-xs">
            Legado
          </TabsTrigger>
        </TabsList>

        <TabsContent value="principal" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Sucursal</Label>
              <Input value={String(form.sucursalId || "")} readOnly />
            </div>
            <div className="space-y-1.5">
              <Label>Número</Label>
              <Input
                type="number"
                min={1}
                value={form.numero || ""}
                onChange={(event) => set("numero", Number(event.target.value) || 0)}
                readOnly={!!punto}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Descripción</Label>
              <Input
                value={form.descripcion}
                onChange={(event) => set("descripcion", event.target.value)}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Tipo</Label>
              <Select
                value={form.tipoPuntoFacturacionId ? String(form.tipoPuntoFacturacionId) : ""}
                onValueChange={(value) => set("tipoPuntoFacturacionId", Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tipos.map((tipo) => (
                    <SelectItem key={tipo.id} value={String(tipo.id)}>
                      {tipo.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="emision" className="mt-4 space-y-4">
          <Card>
            <CardContent className="pt-6">
              <DetailFieldGrid
                fields={[
                  { label: "Sucursal operativa", value: String(form.sucursalId || "Sin sucursal") },
                  {
                    label: "Número visible",
                    value: form.numero ? String(form.numero).padStart(4, "0") : "Sin numeración",
                  },
                  { label: "Tipo configurado", value: selectedTipo?.descripcion ?? "Sin tipo" },
                  {
                    label: "Modo de edición",
                    value: punto ? "Mantenimiento de punto existente" : "Alta de nuevo punto",
                  },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="legado" className="mt-4 space-y-4">
          <Card>
            <CardContent className="pt-6">
              <DetailFieldGrid
                fields={[
                  { label: "Descripción operativa", value: form.descripcion || "Sin descripción" },
                  { label: "Tipo por defecto", value: selectedTipo?.porDefecto ? "Sí" : "No" },
                  { label: "Numerador editable", value: punto ? "No" : "Sí" },
                  {
                    label: "Cobertura actual",
                    value: form.tipoPuntoFacturacionId
                      ? "Punto tipificado para emitir"
                      : "Requiere tipo para operar",
                  },
                ]}
              />
            </CardContent>
          </Card>
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
          {saving ? "Guardando..." : punto ? "Guardar cambios" : "Crear punto"}
        </Button>
      </div>
    </div>
  )
}

export default function PuntosFacturacionPage() {
  const { sucursales } = useSucursales()
  const [sucursalId, setSucursalId] = useState<number | undefined>()
  const { puntos, loading, error, eliminar, getProximoNumero, refetch } =
    usePuntosFacturacion(sucursalId)
  const { tipos } = useTiposPuntoFacturacion()
  const [searchTerm, setSearchTerm] = useState("")
  const [selected, setSelected] = useState<PuntoFacturacion | null>(null)
  const [editing, setEditing] = useState<PuntoFacturacion | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [nextNumber, setNextNumber] = useState<number | null>(null)
  const [loadingNextNumber, setLoadingNextNumber] = useState(false)
  const tipoDescripcionById = useMemo(
    () => new Map(tipos.map((tipo) => [tipo.id, tipo.descripcion])),
    [tipos]
  )

  const getTipoDescripcion = useCallback(
    (id?: number) => (id ? (tipoDescripcionById.get(id) ?? String(id)) : "-"),
    [tipoDescripcionById]
  )
  const getSucursalDescripcion = (id?: number) =>
    sucursales.find((sucursal) => sucursal.id === id)?.descripcion ?? `#${id ?? "-"}`

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase().trim()
    return puntos.filter(
      (punto) =>
        term === "" ||
        punto.descripcion.toLowerCase().includes(term) ||
        String(punto.numero).padStart(4, "0").includes(term) ||
        getTipoDescripcion(punto.tipoPuntoFacturacionId).toLowerCase().includes(term)
    )
  }, [getTipoDescripcion, puntos, searchTerm])

  const activos = puntos.filter((punto) => punto.activo).length
  const inactivos = puntos.filter((punto) => !punto.activo).length
  const conTipo = puntos.filter((punto) => Boolean(punto.tipoPuntoFacturacionId)).length
  const sinTipo = puntos.length - conTipo
  const coverageLabel = sucursalId
    ? `${filtered.length} puntos visibles en ${getSucursalDescripcion(sucursalId)}`
    : `${puntos.length} puntos relevados en el maestro completo`

  const typeCoverage = useMemo(() => {
    return Array.from(
      puntos.reduce((acc, punto) => {
        const key = getTipoDescripcion(punto.tipoPuntoFacturacionId)
        acc.set(key, (acc.get(key) ?? 0) + 1)
        return acc
      }, new Map<string, number>())
    )
      .map(([tipo, cantidad]) => ({ tipo, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 4)
  }, [getTipoDescripcion, puntos])

  const handleDeactivate = async (id: number) => {
    await eliminar(id)
    refetch()
  }

  const openDetail = async (punto: PuntoFacturacion) => {
    setSelected(punto)
    setNextNumber(null)
    setIsDetailOpen(true)

    if (!punto.tipoPuntoFacturacionId) {
      setLoadingNextNumber(false)
      return
    }

    setLoadingNextNumber(true)
    try {
      const value = await getProximoNumero(punto.id, punto.tipoPuntoFacturacionId)
      setNextNumber(value)
    } finally {
      setLoadingNextNumber(false)
    }
  }

  const principalFields = selected
    ? [
        { label: "Número", value: String(selected.numero).padStart(4, "0") },
        { label: "Descripción", value: selected.descripcion },
        { label: "Tipo", value: getTipoDescripcion(selected.tipoPuntoFacturacionId) },
        { label: "Estado", value: selected.activo ? "Activo" : "Inactivo" },
      ]
    : []

  const emisionFields = selected
    ? [
        { label: "Sucursal", value: getSucursalDescripcion(selected.sucursalId) },
        {
          label: "Próximo Número",
          value: loadingNextNumber ? "Consultando..." : String(nextNumber ?? "-"),
        },
        { label: "ID Punto", value: String(selected.id) },
        { label: "Tipo de Numerador", value: getTipoDescripcion(selected.tipoPuntoFacturacionId) },
      ]
    : []

  const circuitFields = selected
    ? [
        { label: "Estado operativo", value: getOperationalStatus(selected) },
        {
          label: "Estado de numeración",
          value: getNumberingStatus(nextNumber, loadingNextNumber, selected),
        },
        {
          label: "Cobertura de sucursal",
          value: getSucursalDescripcion(selected.sucursalId),
        },
        {
          label: "Tipo configurado",
          value: getTipoDescripcion(selected.tipoPuntoFacturacionId),
        },
      ]
    : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Puntos de Facturación</h1>
          <p className="text-muted-foreground mt-1">
            Configuración modernizada de puntos de venta con base en la operatoria legacy
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setIsFormOpen(true)
          }}
          disabled={!sucursalId}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo punto
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{puntos.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Puntos configurados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activos}</div>
            <p className="text-xs text-muted-foreground mt-1">En uso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactivos</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inactivos}</div>
            <p className="text-xs text-muted-foreground mt-1">Deshabilitados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sucursal</CardTitle>
            <ReceiptText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {sucursalId ? getSucursalDescripcion(sucursalId) : "Sin selección"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Contexto operativo</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-[260px_1fr]">
            <Select
              value={sucursalId ? String(sucursalId) : "todas"}
              onValueChange={(value) =>
                setSucursalId(value === "todas" ? undefined : Number(value))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar sucursal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las sucursales</SelectItem>
                {sucursales.map((sucursal) => (
                  <SelectItem key={sucursal.id} value={String(sucursal.id)}>
                    {sucursal.descripcion}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, descripción o tipo..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Puntos de Facturación</CardTitle>
          <CardDescription>
            {sucursalId
              ? `${filtered.length} puntos en la sucursal seleccionada`
              : "Seleccione una sucursal para operar o revise el maestro completo"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : !sucursalId ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Seleccione una sucursal para ver los puntos de facturación
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No hay puntos de facturación para esta sucursal
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((punto) => (
                  <TableRow
                    key={punto.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => void openDetail(punto)}
                  >
                    <TableCell className="font-medium">
                      {String(punto.numero).padStart(4, "0")}
                    </TableCell>
                    <TableCell>{punto.descripcion}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {getTipoDescripcion(punto.tipoPuntoFacturacionId)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={punto.activo ? "default" : "secondary"}>
                        {punto.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => void openDetail(punto)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditing(punto)
                            setIsFormOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeactivate(punto.id)}
                        >
                          Baja
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ReceiptText className="h-4 w-4" /> Cobertura operativa
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{coverageLabel}.</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="h-4 w-4" /> Configuración actual
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {activos} activos y {conTipo} con tipo explícito para sostener la operatoria visible
            hoy.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Landmark className="h-4 w-4" /> Segunda fase
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {sinTipo > 0
              ? `${sinTipo} puntos todavía no tienen tipo explícito y son el principal hueco operativo visible.`
              : "Todos los puntos visibles tienen tipo asignado dentro del contrato actual."}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tipificación operativa</CardTitle>
          <CardDescription>Distribución real de puntos según el tipo configurado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {typeCoverage.map((row) => (
              <div key={row.tipo} className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">{row.tipo}</p>
                <p className="mt-1 text-2xl font-bold">{row.cantidad}</p>
              </div>
            ))}
            {typeCoverage.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No hay puntos tipificados en la selección actual.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar punto de facturación" : "Nuevo punto de facturación"}
            </DialogTitle>
            <DialogDescription>
              Alta y mantenimiento del punto de venta sobre la API actual, conservando la estructura
              operativa del legado.
            </DialogDescription>
          </DialogHeader>
          <PuntoForm
            key={
              editing
                ? `edit-${editing.id}`
                : `new-${sucursalId ?? 0}-${tipos.find((tipo) => tipo.porDefecto)?.id ?? tipos[0]?.id ?? 0}`
            }
            punto={editing}
            sucursalId={sucursalId}
            onClose={() => setIsFormOpen(false)}
            onSaved={() => {
              setIsFormOpen(false)
              setEditing(null)
              refetch()
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" /> Punto{" "}
              {selected ? String(selected.numero).padStart(4, "0") : ""}
            </DialogTitle>
            <DialogDescription>{selected?.descripcion}</DialogDescription>
          </DialogHeader>

          {selected && (
            <Tabs defaultValue="principal" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="principal">Principal</TabsTrigger>
                <TabsTrigger value="circuito">Circuito</TabsTrigger>
                <TabsTrigger value="emision">Emisión</TabsTrigger>
                <TabsTrigger value="legado">Legado</TabsTrigger>
              </TabsList>

              <TabsContent value="principal" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ReceiptText className="h-4 w-4" /> Datos del Punto
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DetailFieldGrid fields={principalFields} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="circuito" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CheckCircle className="h-4 w-4" /> Estado operativo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DetailFieldGrid fields={circuitFields} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="emision" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <MapPin className="h-4 w-4" /> Operación
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DetailFieldGrid fields={emisionFields} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="legado" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Landmark className="h-4 w-4" /> Estructura heredada
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DetailFieldGrid
                      fields={[
                        {
                          label: "Estado del punto",
                          value: selected.activo ? "Activo" : "Inactivo",
                        },
                        {
                          label: "Tipo configurado",
                          value: getTipoDescripcion(selected.tipoPuntoFacturacionId),
                        },
                        {
                          label: "Numeración siguiente",
                          value: loadingNextNumber ? "Consultando..." : String(nextNumber ?? "-"),
                        },
                        {
                          label: "Sucursal asociada",
                          value: getSucursalDescripcion(selected.sucursalId),
                        },
                      ]}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDetailOpen(false)
                setSelected(null)
                setNextNumber(null)
              }}
            >
              Cerrar
            </Button>
            {selected && (
              <Button
                onClick={() => {
                  setIsDetailOpen(false)
                  setNextNumber(null)
                  setEditing(selected)
                  setIsFormOpen(true)
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Editar punto
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
