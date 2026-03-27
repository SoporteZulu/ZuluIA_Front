"use client"

import { useMemo, useState } from "react"
import { AlertCircle, Eye, Plus, RefreshCw, Trash2 } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useCajas } from "@/lib/hooks/useCajas"
import { useComprobantes } from "@/lib/hooks/useComprobantes"
import { useConfiguracion } from "@/lib/hooks/useConfiguracion"
import { useCobros } from "@/lib/hooks/useCobros"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"
import { useTerceros } from "@/lib/hooks/useTerceros"
import type { CobroDetalle, RegistrarCobroDto } from "@/lib/types/cobros"

type CobroMode = "simple" | "ventanilla" | "recibo-masivo"

type DraftPayment = {
  id: string
  formaPagoId: string
  cajaId: string
  importe: string
}

type DraftAllocation = {
  id: string
  comprobanteId: string
  importe: string
}

type DraftForm = {
  terceroId: string
  fecha: string
  mode: CobroMode
  medios: DraftPayment[]
  imputaciones: DraftAllocation[]
}

function formatMoney(value: number) {
  return value.toLocaleString("es-AR", { style: "currency", currency: "ARS" })
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "-"
}

function renderStatusBadge(status: string) {
  if (status === "ANULADO") return <Badge variant="destructive">Anulado</Badge>
  if (status === "APLICADO") return <Badge>Aplicado</Badge>
  return <Badge variant="secondary">{status}</Badge>
}

function createPayment(seed = 1): DraftPayment {
  return {
    id: `medio-${seed}`,
    formaPagoId: "",
    cajaId: "",
    importe: "",
  }
}

function createAllocation(seed = 1): DraftAllocation {
  return {
    id: `imputacion-${seed}`,
    comprobanteId: "",
    importe: "",
  }
}

function createEmptyForm(): DraftForm {
  return {
    terceroId: "",
    fecha: new Date().toISOString().slice(0, 10),
    mode: "simple",
    medios: [createPayment()],
    imputaciones: [],
  }
}

export default function CobrosVentasPage() {
  const sucursalId = useDefaultSucursalId()
  const { cobros, loading, error, registrar, anular, getById, refetch } = useCobros({ sucursalId })
  const { cajas } = useCajas(sucursalId)
  const { formasPago } = useConfiguracion()
  const { comprobantes } = useComprobantes({ esVenta: true })
  const { terceros } = useTerceros({ soloActivos: false })
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [form, setForm] = useState<DraftForm>(() => createEmptyForm())
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState<CobroDetalle | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)

  const clientes = useMemo(() => terceros.filter((row) => row.esCliente), [terceros])
  const customerMap = useMemo(() => new Map(clientes.map((row) => [row.id, row])), [clientes])
  const currentCustomer = form.terceroId ? customerMap.get(Number(form.terceroId)) : null
  const pendingDocs = useMemo(
    () =>
      form.terceroId
        ? comprobantes.filter(
            (row) =>
              row.terceroId === Number(form.terceroId) && row.saldo > 0 && row.estado !== "ANULADO"
          )
        : [],
    [comprobantes, form.terceroId]
  )

  const totals = useMemo(
    () => ({
      count: cobros.length,
      amount: cobros.reduce((sum, row) => sum + Number(row.total ?? 0), 0),
      annulled: cobros.filter((row) => row.estado === "ANULADO").length,
      customers: new Set(cobros.map((row) => row.terceroId)).size,
    }),
    [cobros]
  )

  const formTotals = useMemo(() => {
    const medios = form.medios.reduce((sum, row) => sum + Number(row.importe || 0), 0)
    const imputaciones = form.imputaciones.reduce((sum, row) => sum + Number(row.importe || 0), 0)
    return {
      medios,
      imputaciones,
      aCuentaCorriente: Math.max(medios - imputaciones, 0),
    }
  }, [form.imputaciones, form.medios])

  const highlighted = cobros[0] ?? null
  const pendingTotal = useMemo(
    () => pendingDocs.reduce((sum, row) => sum + Number(row.saldo ?? 0), 0),
    [pendingDocs]
  )

  const resetForm = () => {
    setForm(createEmptyForm())
    setFormError(null)
  }

  const updatePayment = (id: string, patch: Partial<DraftPayment>) => {
    setForm((prev) => ({
      ...prev,
      medios: prev.medios.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    }))
  }

  const updateAllocation = (id: string, patch: Partial<DraftAllocation>) => {
    setForm((prev) => ({
      ...prev,
      imputaciones: prev.imputaciones.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    }))
  }

  const addPayment = () => {
    setForm((prev) => ({
      ...prev,
      medios: [...prev.medios, createPayment(prev.medios.length + 1)],
    }))
  }

  const removePayment = (id: string) => {
    setForm((prev) => ({
      ...prev,
      medios: prev.medios.length === 1 ? prev.medios : prev.medios.filter((row) => row.id !== id),
    }))
  }

  const addAllocation = () => {
    setForm((prev) => ({
      ...prev,
      imputaciones: [...prev.imputaciones, createAllocation(prev.imputaciones.length + 1)],
    }))
  }

  const removeAllocation = (id: string) => {
    setForm((prev) => ({
      ...prev,
      imputaciones: prev.imputaciones.filter((row) => row.id !== id),
    }))
  }

  const handleSave = async () => {
    if (!sucursalId) {
      setFormError("No hay sucursal operativa disponible")
      return
    }
    if (!form.terceroId) {
      setFormError("El cliente es obligatorio")
      return
    }

    const mediosValidos = form.medios.filter(
      (row) => row.formaPagoId && row.cajaId && Number(row.importe) > 0
    )
    if (mediosValidos.length === 0) {
      setFormError("Debe cargar al menos un medio válido con forma de pago, caja e importe")
      return
    }

    if (
      form.medios.some(
        (row) => (row.formaPagoId || row.cajaId || row.importe) && Number(row.importe) <= 0
      )
    ) {
      setFormError("Los importes de medios deben ser mayores a cero")
      return
    }

    if (
      form.imputaciones.some(
        (row) => !row.comprobanteId || Number(row.importe) <= 0 || Number.isNaN(Number(row.importe))
      )
    ) {
      setFormError("Cada imputación debe indicar comprobante e importe válido")
      return
    }

    const comprobantesDuplicados = new Set<string>()
    for (const row of form.imputaciones) {
      if (comprobantesDuplicados.has(row.comprobanteId)) {
        setFormError("No puede repetir el mismo comprobante en varias imputaciones")
        return
      }
      comprobantesDuplicados.add(row.comprobanteId)
    }

    if (formTotals.imputaciones > formTotals.medios) {
      setFormError("La suma imputada no puede superar el total cobrado")
      return
    }

    const dto: RegistrarCobroDto = {
      sucursalId,
      terceroId: Number(form.terceroId),
      fecha: form.fecha,
      medios: mediosValidos.map((row) => {
        const selectedCaja = cajas.find((item) => item.id === Number(row.cajaId))
        return {
          formaPagoId: Number(row.formaPagoId),
          cajaId: Number(row.cajaId),
          importe: Number(row.importe),
          monedaId: selectedCaja?.monedaId ?? currentCustomer?.monedaId ?? 1,
          cotizacion: 1,
        }
      }),
      imputaciones:
        form.imputaciones.length > 0
          ? form.imputaciones.map((row) => ({
              comprobanteId: Number(row.comprobanteId),
              importe: Number(row.importe),
            }))
          : undefined,
    }

    setSaving(true)
    setFormError(null)
    const ok = await registrar(dto)
    setSaving(false)
    if (!ok) {
      setFormError("No se pudo registrar el cobro")
      return
    }

    resetForm()
    setIsFormOpen(false)
    await refetch()
  }

  const handleDetail = async (id: number) => {
    setDetailOpen(true)
    setDetailLoading(true)
    const loaded = await getById(id)
    setDetail(loaded)
    setDetailLoading(false)
  }

  const handleAnnul = async (id: number) => {
    if (!window.confirm(`¿Anular cobro #${id}?`)) return
    const ok = await anular(id)
    if (ok) await refetch()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cobros</h1>
          <p className="mt-1 text-muted-foreground">
            Registro y consulta de cobros con múltiples medios e imputaciones usando el contrato
            real disponible. Lo no cubierto por backend queda expuesto desde Operaciones Legacy.
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setIsFormOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Nuevo cobro
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Esta pantalla ya soporta recibos compuestos, cobro por ventanilla e imputación parcial. Si
          el total no se asigna completo, el remanente queda explícitamente a cuenta corriente.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cobros visibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Importe visible</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(totals.amount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Anulados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totals.annulled}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Clientes con cobros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.customers}</div>
          </CardContent>
        </Card>
      </div>

      {highlighted ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardDescription>Último cobro visible</CardDescription>
            <CardTitle className="mt-1 text-xl">Cobro #{highlighted.id}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Cliente</p>
              <p className="text-sm font-medium">
                {customerMap.get(highlighted.terceroId)?.razonSocial ?? `#${highlighted.terceroId}`}
              </p>
            </div>
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Fecha</p>
              <p className="text-sm font-medium">{formatDate(highlighted.fecha)}</p>
            </div>
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Estado</p>
              <p className="text-sm font-medium">{highlighted.estado}</p>
            </div>
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Importe</p>
              <p className="text-sm font-medium">{formatMoney(highlighted.total)}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Cobros registrados</CardTitle>
            <CardDescription>
              Lectura operativa del circuito actual con anulación y detalle por medios.
            </CardDescription>
          </div>
          <Button variant="outline" className="bg-transparent" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Recargar
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loading && cobros.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No hay cobros visibles para la sucursal actual.
                  </TableCell>
                </TableRow>
              ) : null}
              {cobros.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">#{row.id}</TableCell>
                  <TableCell>
                    {customerMap.get(row.terceroId)?.razonSocial ?? `#${row.terceroId}`}
                  </TableCell>
                  <TableCell>{formatDate(row.fecha)}</TableCell>
                  <TableCell>{renderStatusBadge(row.estado)}</TableCell>
                  <TableCell className="text-right">{formatMoney(row.total)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="icon" variant="ghost" onClick={() => handleDetail(row.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {row.estado !== "ANULADO" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-transparent"
                          onClick={() => handleAnnul(row.id)}
                        >
                          Anular
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo cobro</DialogTitle>
            <DialogDescription>
              Alta real con múltiples medios e imputaciones. Los modos replican uso operativo:
              simple, ventanilla y recibo masivo.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Cliente</Label>
                  <Select
                    value={form.terceroId}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, terceroId: value, imputaciones: [] }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((row) => (
                        <SelectItem key={row.id} value={String(row.id)}>
                          {row.razonSocial}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Fecha</Label>
                  <Input
                    type="date"
                    value={form.fecha}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, fecha: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Modo operativo</Label>
                  <Select
                    value={form.mode}
                    onValueChange={(value: CobroMode) =>
                      setForm((prev) => ({ ...prev, mode: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simple">Cobro simple</SelectItem>
                      <SelectItem value="ventanilla">Cobro por ventanilla</SelectItem>
                      <SelectItem value="recibo-masivo">Recibo masivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">Medios de cobro</CardTitle>
                    <CardDescription>
                      El DTO real permite varios medios en un mismo recibo. Esta pantalla ya los
                      usa.
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="bg-transparent"
                    onClick={addPayment}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Agregar medio
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {form.medios.map((medio, index) => (
                    <div key={medio.id} className="rounded-lg border p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">Medio {index + 1}</p>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => removePayment(medio.id)}
                          disabled={form.medios.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-1.5">
                          <Label>Forma de pago</Label>
                          <Select
                            value={medio.formaPagoId}
                            onValueChange={(value) =>
                              updatePayment(medio.id, { formaPagoId: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar forma" />
                            </SelectTrigger>
                            <SelectContent>
                              {formasPago.map((row) => (
                                <SelectItem key={row.id} value={String(row.id)}>
                                  {row.descripcion}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Caja</Label>
                          <Select
                            value={medio.cajaId}
                            onValueChange={(value) => updatePayment(medio.id, { cajaId: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar caja" />
                            </SelectTrigger>
                            <SelectContent>
                              {cajas.map((row) => (
                                <SelectItem key={row.id} value={String(row.id)}>
                                  {row.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Importe</Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={medio.importe}
                            onChange={(event) =>
                              updatePayment(medio.id, { importe: event.target.value })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">Imputaciones</CardTitle>
                    <CardDescription>
                      Aplicación contra comprobantes pendientes del cliente. Lo no imputado queda a
                      cuenta.
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="bg-transparent"
                    onClick={addAllocation}
                    disabled={!form.terceroId || pendingDocs.length === 0}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Agregar imputación
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!form.terceroId ? (
                    <p className="text-sm text-muted-foreground">
                      Seleccione un cliente para ver comprobantes pendientes.
                    </p>
                  ) : null}
                  {form.terceroId && pendingDocs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      El cliente no tiene comprobantes con saldo pendiente.
                    </p>
                  ) : null}
                  {form.imputaciones.map((imputacion, index) => (
                    <div key={imputacion.id} className="rounded-lg border p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">Imputación {index + 1}</p>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => removeAllocation(imputacion.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid gap-4 md:grid-cols-[1fr_180px]">
                        <div className="space-y-1.5">
                          <Label>Comprobante</Label>
                          <Select
                            value={imputacion.comprobanteId}
                            onValueChange={(value) =>
                              updateAllocation(imputacion.id, { comprobanteId: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar comprobante" />
                            </SelectTrigger>
                            <SelectContent>
                              {pendingDocs.map((row) => (
                                <SelectItem key={row.id} value={String(row.id)}>
                                  {(row.nroComprobante ?? `#${row.id}`) +
                                    " · saldo " +
                                    formatMoney(row.saldo)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Importe</Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={imputacion.importe}
                            onChange={(event) =>
                              updateAllocation(imputacion.id, { importe: event.target.value })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Resumen operativo</CardTitle>
                  <CardDescription>
                    Lectura del recibo antes de registrar el movimiento real.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Modo</span>
                    <Badge variant="secondary">{form.mode}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total medios</span>
                    <span className="font-medium">{formatMoney(formTotals.medios)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total imputado</span>
                    <span className="font-medium">{formatMoney(formTotals.imputaciones)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t pt-3">
                    <span className="text-muted-foreground">A cuenta corriente</span>
                    <span className="font-medium">{formatMoney(formTotals.aCuentaCorriente)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Cliente y cartera</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Cliente:{" "}
                    <span className="font-medium text-foreground">
                      {currentCustomer?.razonSocial ?? "Sin seleccionar"}
                    </span>
                  </p>
                  <p>Comprobantes pendientes: {pendingDocs.length}</p>
                  <p>Saldo pendiente visible: {formatMoney(pendingTotal)}</p>
                  <p>
                    Cobertura backend: múltiples medios e imputaciones. Quedan fuera la conciliación
                    avanzada y los lotes automáticos sin endpoint específico.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {formError ? <p className="text-sm text-red-500">{formError}</p> : null}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={() => {
                setIsFormOpen(false)
                resetForm()
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : "Registrar cobro"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalle de cobro</DialogTitle>
            <DialogDescription>Medios aplicados en el registro seleccionado.</DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <div className="py-10 text-center text-muted-foreground">Cargando detalle...</div>
          ) : detail ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="mb-1 block text-xs text-muted-foreground">Cliente</span>
                  <p className="text-sm font-medium">
                    {customerMap.get(detail.terceroId)?.razonSocial ?? `#${detail.terceroId}`}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="mb-1 block text-xs text-muted-foreground">Fecha</span>
                  <p className="text-sm font-medium">{formatDate(detail.fecha)}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="mb-1 block text-xs text-muted-foreground">Estado</span>
                  <p className="text-sm font-medium">{detail.estado}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="mb-1 block text-xs text-muted-foreground">Total</span>
                  <p className="text-sm font-medium">{formatMoney(detail.total)}</p>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Forma pago</TableHead>
                    <TableHead>Caja</TableHead>
                    <TableHead>Moneda</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.medios.map((medio) => (
                    <TableRow key={medio.id}>
                      <TableCell>{medio.formaPagoDescripcion}</TableCell>
                      <TableCell>{medio.cajaDescripcion}</TableCell>
                      <TableCell>{medio.monedaSimbolo}</TableCell>
                      <TableCell className="text-right">{formatMoney(medio.importe)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-10 text-center text-muted-foreground">
              No se pudo cargar el detalle del cobro.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
