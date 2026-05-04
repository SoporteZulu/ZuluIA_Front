"use client"

import React, { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  AlertCircle,
  CheckCircle,
  DollarSign,
  Eye,
  FileText,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { useHdClientes, useHdFacturacion, useHdServicios } from "@/lib/hooks/useHelpdesk"
import type { HDFacturaItem, HDFacturaServicio } from "@/lib/types"

const ESTADO_LABELS: Record<HDFacturaServicio["estado"], string> = {
  borrador: "Borrador",
  emitida: "Emitida",
  pagada: "Pagada",
  vencida: "Vencida",
  anulada: "Anulada",
}

const ESTADO_COLORS: Record<HDFacturaServicio["estado"], string> = {
  borrador: "bg-slate-100 text-slate-700",
  emitida: "bg-blue-100 text-blue-700",
  pagada: "bg-emerald-100 text-emerald-700",
  vencida: "bg-red-100 text-red-700",
  anulada: "bg-amber-100 text-amber-700",
}

type FacturaFormState = {
  numero: string
  clienteId: string
  fecha: string
  fechaVencimiento: string
  moneda: HDFacturaServicio["moneda"]
  descuento: string
  impuestos: string
  metodoPago: string
  referenciaPago: string
  notas: string
}

const EMPTY_FORM: FacturaFormState = {
  numero: "",
  clienteId: "",
  fecha: "",
  fechaVencimiento: "",
  moneda: "USD",
  descuento: "0",
  impuestos: "0",
  metodoPago: "",
  referenciaPago: "",
  notas: "",
}

const CURRENCY_CODES: HDFacturaServicio["moneda"][] = ["ARS", "USD", "EUR", "MXN"]

function parseCalendarDate(value?: Date | string | null) {
  if (!value) return null
  if (value instanceof Date) return value

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number)
    return new Date(year, month - 1, day)
  }

  const parsedDate = new Date(value)
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
}

function toInputDate(value?: Date | string) {
  if (!value) return ""
  const date = parseCalendarDate(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString().slice(0, 10)
}

function formatCurrency(value: number, currency: HDFacturaServicio["moneda"] = "USD") {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency }).format(value)
}

function sumByCurrency(facturas: HDFacturaServicio[]) {
  return facturas.reduce<Record<HDFacturaServicio["moneda"], number>>(
    (accumulator, factura) => {
      accumulator[factura.moneda] += factura.total
      return accumulator
    },
    { ARS: 0, USD: 0, EUR: 0, MXN: 0 }
  )
}

function renderCurrencySummary(values: Record<HDFacturaServicio["moneda"], number>) {
  const activeCurrencies = CURRENCY_CODES.filter((currency) => values[currency] > 0)

  if (!activeCurrencies.length) {
    return formatCurrency(0, "ARS")
  }

  return activeCurrencies.map((currency) => formatCurrency(values[currency], currency)).join(" • ")
}

function formatDate(value?: Date | string) {
  if (!value) return "-"
  const date = parseCalendarDate(value)
  if (!date) return "-"
  return date.toLocaleDateString("es-AR")
}

function buildFormState(factura?: HDFacturaServicio | null): FacturaFormState {
  if (!factura) return EMPTY_FORM

  return {
    numero: factura.numero,
    clienteId: factura.clienteId,
    fecha: toInputDate(factura.fecha),
    fechaVencimiento: toInputDate(factura.fechaVencimiento),
    moneda: factura.moneda,
    descuento: String(factura.descuento ?? 0),
    impuestos: String(factura.impuestos ?? 0),
    metodoPago: factura.metodoPago ?? "",
    referenciaPago: factura.referenciaPago ?? "",
    notas: factura.notas ?? "",
  }
}

function createEmptyItem(): HDFacturaItem {
  return {
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    descripcion: "",
    cantidad: 1,
    precioUnitario: 0,
    descuento: 0,
    impuesto: 0,
    total: 0,
  }
}

function normalizeItem(item: HDFacturaItem): HDFacturaItem {
  const gross = item.cantidad * item.precioUnitario
  const discountAmount = gross * (item.descuento / 100)
  const net = gross - discountAmount
  const taxAmount = net * (item.impuesto / 100)

  return {
    ...item,
    total: Number((net + taxAmount).toFixed(2)),
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

function FacturacionContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { facturas, loading, error, createFactura, updateFactura, deleteFactura, refetch } =
    useHdFacturacion()
  const { clientes } = useHdClientes()
  const { servicios } = useHdServicios()

  const [isFormOpen, setIsFormOpen] = useState(searchParams.get("action") === "new")
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [editingFactura, setEditingFactura] = useState<HDFacturaServicio | null>(null)
  const [selectedFactura, setSelectedFactura] = useState<HDFacturaServicio | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<HDFacturaServicio | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterEstado, setFilterEstado] = useState<"all" | HDFacturaServicio["estado"]>("all")
  const [formData, setFormData] = useState<FacturaFormState>(EMPTY_FORM)
  const [items, setItems] = useState<HDFacturaItem[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (searchParams.get("action") !== "new") return

    const issueDate = new Date()
    const dueDate = new Date(issueDate)
    dueDate.setDate(dueDate.getDate() + 30)

    setEditingFactura(null)
    setSaveError(null)
    setItems([])
    setFormData({
      ...EMPTY_FORM,
      numero: `FAC-${String(facturas.length + 1).padStart(5, "0")}`,
      fecha: toInputDate(issueDate),
      fechaVencimiento: toInputDate(dueDate),
    })
    setIsFormOpen(true)
  }, [facturas.length, searchParams])

  const filteredFacturas = useMemo(() => {
    return facturas.filter((factura) => {
      const cliente = clientes.find((current) => current.id === factura.clienteId)
      const matchesSearch =
        factura.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cliente?.nombre.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesEstado = filterEstado === "all" || factura.estado === filterEstado
      return matchesSearch && matchesEstado
    })
  }, [clientes, facturas, filterEstado, searchTerm])

  const totalsByCurrency = useMemo(
    () => ({
      facturado: sumByCurrency(facturas.filter((factura) => factura.estado !== "anulada")),
      cobrado: sumByCurrency(facturas.filter((factura) => factura.estado === "pagada")),
    }),
    [facturas]
  )

  const stats = useMemo(
    () => ({
      total: facturas.length,
      pendientes: facturas.filter((factura) => factura.estado === "emitida").length,
      pagadas: facturas.filter((factura) => factura.estado === "pagada").length,
      vencidas: facturas.filter((factura) => factura.estado === "vencida").length,
      totalFacturado: facturas
        .filter((factura) => factura.estado !== "anulada")
        .reduce((sum, factura) => sum + factura.total, 0),
      totalCobrado: facturas
        .filter((factura) => factura.estado === "pagada")
        .reduce((sum, factura) => sum + factura.total, 0),
    }),
    [facturas]
  )

  const totals = useMemo(() => {
    const subtotalItems = items.reduce((sum, item) => {
      const gross = item.cantidad * item.precioUnitario
      const discountAmount = gross * (item.descuento / 100)
      return sum + (gross - discountAmount)
    }, 0)

    const itemsTaxes = items.reduce((sum, item) => {
      const gross = item.cantidad * item.precioUnitario
      const discountAmount = gross * (item.descuento / 100)
      const net = gross - discountAmount
      return sum + net * (item.impuesto / 100)
    }, 0)

    const descuentoCabecera = Number(formData.descuento || 0)
    const impuestosCabecera = Number(formData.impuestos || 0)

    return {
      subtotal: Number(subtotalItems.toFixed(2)),
      impuestos: Number((itemsTaxes + impuestosCabecera).toFixed(2)),
      total: Number(
        (subtotalItems - descuentoCabecera + itemsTaxes + impuestosCabecera).toFixed(2)
      ),
    }
  }, [formData.descuento, formData.impuestos, items])

  function openCreate() {
    const issueDate = new Date()
    const dueDate = new Date(issueDate)
    dueDate.setDate(dueDate.getDate() + 30)

    setEditingFactura(null)
    setSaveError(null)
    setItems([])
    setFormData({
      ...EMPTY_FORM,
      numero: `FAC-${String(facturas.length + 1).padStart(5, "0")}`,
      fecha: toInputDate(issueDate),
      fechaVencimiento: toInputDate(dueDate),
    })
    setIsFormOpen(true)
  }

  function openEdit(factura: HDFacturaServicio) {
    setSelectedFactura(factura)
    setIsDetailOpen(false)
    setEditingFactura(factura)
    setSaveError(null)
    setFormData(buildFormState(factura))
    setItems(factura.items.map(normalizeItem))
    setIsFormOpen(true)
  }

  function closeForm() {
    setIsFormOpen(false)
    setEditingFactura(null)
    setSaveError(null)
    router.push("/helpdesk/facturacion")
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (
      !formData.numero.trim() ||
      !formData.clienteId ||
      !formData.fecha ||
      !formData.fechaVencimiento
    ) {
      setSaveError("Numero, cliente y fechas son obligatorios.")
      return
    }

    if (items.length === 0) {
      setSaveError("La factura debe tener al menos un item.")
      return
    }

    if (
      items.some(
        (item) => !item.descripcion.trim() || item.cantidad <= 0 || item.precioUnitario < 0
      )
    ) {
      setSaveError("Revisa los renglones: descripcion, cantidad y precio deben ser validos.")
      return
    }

    setSaving(true)
    setSaveError(null)

    const payload = {
      numero: formData.numero.trim(),
      clienteId: formData.clienteId,
      ordenesServicioIds: editingFactura?.ordenesServicioIds ?? [],
      fecha: new Date(`${formData.fecha}T00:00:00`),
      fechaVencimiento: new Date(`${formData.fechaVencimiento}T00:00:00`),
      estado: editingFactura?.estado ?? "borrador",
      items: items.map(normalizeItem),
      subtotal: totals.subtotal,
      descuento: Number(formData.descuento || 0),
      impuestos: totals.impuestos,
      total: totals.total,
      moneda: formData.moneda,
      metodoPago: formData.metodoPago.trim() || undefined,
      referenciaPago: formData.referenciaPago.trim() || undefined,
      notas: formData.notas.trim() || undefined,
    } satisfies Omit<HDFacturaServicio, "id" | "createdAt" | "updatedAt">

    try {
      let persistedFactura: HDFacturaServicio

      if (editingFactura) {
        persistedFactura = await updateFactura(editingFactura.id, payload)
      } else {
        persistedFactura = await createFactura(payload)
      }

      if (selectedFactura?.id === persistedFactura.id) {
        setSelectedFactura(persistedFactura)
      }

      closeForm()
    } catch (persistError) {
      setSaveError(
        persistError instanceof Error ? persistError.message : "No se pudo guardar la factura."
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(
    factura: HDFacturaServicio,
    estado: HDFacturaServicio["estado"]
  ) {
    try {
      const updated = await updateFactura(factura.id, { estado })
      if (selectedFactura?.id === factura.id) {
        setSelectedFactura(updated)
      }
    } catch (statusError) {
      setSaveError(
        statusError instanceof Error ? statusError.message : "No se pudo actualizar el estado."
      )
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return

    try {
      await deleteFactura(deleteTarget.id)
      if (selectedFactura?.id === deleteTarget.id) {
        setSelectedFactura(null)
        setIsDetailOpen(false)
      }
      setDeleteTarget(null)
    } catch (deleteError) {
      setSaveError(
        deleteError instanceof Error ? deleteError.message : "No se pudo eliminar la factura."
      )
    }
  }

  function addServiceItem(serviceId: string) {
    const servicio = servicios.find((current) => current.id === serviceId)
    if (!servicio) return

    setItems((current) => [
      ...current,
      normalizeItem({
        id: `item-${serviceId}-${Date.now()}`,
        descripcion: servicio.nombre,
        servicioId: servicio.id,
        cantidad: 1,
        precioUnitario: servicio.precioBase,
        descuento: 0,
        impuesto: 21,
        total: servicio.precioBase,
      }),
    ])
  }

  function updateItem(itemId: string, key: keyof HDFacturaItem, value: string | number) {
    setItems((current) =>
      current.map((item) => {
        if (item.id !== itemId) return item
        return normalizeItem({ ...item, [key]: value })
      })
    )
  }

  function removeItem(itemId: string) {
    setItems((current) => current.filter((item) => item.id !== itemId))
  }

  const detailFields = selectedFactura
    ? [
        { label: "Numero", value: selectedFactura.numero },
        {
          label: "Cliente",
          value:
            clientes.find((cliente) => cliente.id === selectedFactura.clienteId)?.nombre ??
            selectedFactura.clienteId,
        },
        { label: "Fecha", value: formatDate(selectedFactura.fecha) },
        { label: "Vencimiento", value: formatDate(selectedFactura.fechaVencimiento) },
        { label: "Estado", value: ESTADO_LABELS[selectedFactura.estado] },
        { label: "Moneda", value: selectedFactura.moneda },
        { label: "Metodo de pago", value: selectedFactura.metodoPago ?? "-" },
        { label: "Referencia", value: selectedFactura.referenciaPago ?? "-" },
      ]
    : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Facturacion</h1>
          <p className="text-muted-foreground">
            Maestro operativo de facturas de servicios con cabecera, renglones y transiciones
            reales.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Factura
          </Button>
        </div>
      </div>

      {(error || saveError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Facturacion helpdesk</AlertTitle>
          <AlertDescription>{saveError ?? error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Facturas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Send className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendientes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pagadas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Facturado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {renderCurrencySummary(totalsByCurrency.facturado)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cobrado</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {renderCurrencySummary(totalsByCurrency.cobrado)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="min-w-50 flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por numero o cliente..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={filterEstado}
              onValueChange={(value) => setFilterEstado(value as typeof filterEstado)}
            >
              <SelectTrigger className="w-37.5">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="borrador">Borradores</SelectItem>
                <SelectItem value="emitida">Emitidas</SelectItem>
                <SelectItem value="pagada">Pagadas</SelectItem>
                <SelectItem value="vencida">Vencidas</SelectItem>
                <SelectItem value="anulada">Anuladas</SelectItem>
              </SelectContent>
            </Select>
            {(searchTerm || filterEstado !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("")
                  setFilterEstado("all")
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Facturas</CardTitle>
          <CardDescription>{filteredFacturas.length} factura(s) encontrada(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numero</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Cargando facturas...
                  </TableCell>
                </TableRow>
              ) : filteredFacturas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No se encontraron facturas.
                  </TableCell>
                </TableRow>
              ) : (
                filteredFacturas.map((factura) => {
                  const cliente = clientes.find((current) => current.id === factura.clienteId)
                  return (
                    <TableRow key={factura.id} className="group">
                      <TableCell className="font-mono text-sm">{factura.numero}</TableCell>
                      <TableCell className="font-medium">
                        {cliente?.nombre ?? factura.clienteId}
                      </TableCell>
                      <TableCell>{formatDate(factura.fecha)}</TableCell>
                      <TableCell>{formatDate(factura.fechaVencimiento)}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(factura.total, factura.moneda)}
                      </TableCell>
                      <TableCell>
                        <Badge className={ESTADO_COLORS[factura.estado]}>
                          {ESTADO_LABELS[factura.estado]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedFactura(factura)
                              setIsDetailOpen(true)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {factura.estado === "borrador" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => void handleStatusChange(factura, "emitida")}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                          {factura.estado === "emitida" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => void handleStatusChange(factura, "pagada")}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => openEdit(factura)}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(factura)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(open) => (open ? setIsFormOpen(true) : closeForm())}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingFactura ? "Editar Factura" : "Nueva Factura"}</DialogTitle>
            <DialogDescription>
              Cabecera e items reales de facturacion de servicios sobre el hook actual de helpdesk.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(event) => void handleSubmit(event)} className="space-y-6">
            <Tabs defaultValue="principal" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="principal">Principal</TabsTrigger>
                <TabsTrigger value="items">Items</TabsTrigger>
                <TabsTrigger value="totales">Totales</TabsTrigger>
                <TabsTrigger value="legado">Legado</TabsTrigger>
              </TabsList>

              <TabsContent value="principal" className="space-y-4 pt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="numero">Numero de Factura</Label>
                    <Input
                      id="numero"
                      value={formData.numero}
                      onChange={(event) =>
                        setFormData((current) => ({ ...current, numero: event.target.value }))
                      }
                      required
                      disabled={Boolean(editingFactura)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <Select
                      value={formData.clienteId}
                      onValueChange={(value) =>
                        setFormData((current) => ({ ...current, clienteId: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.map((cliente) => (
                          <SelectItem key={cliente.id} value={cliente.id}>
                            {cliente.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fecha">Fecha Emision</Label>
                    <Input
                      id="fecha"
                      type="date"
                      value={formData.fecha}
                      onChange={(event) =>
                        setFormData((current) => ({ ...current, fecha: event.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fechaVencimiento">Fecha Vencimiento</Label>
                    <Input
                      id="fechaVencimiento"
                      type="date"
                      value={formData.fechaVencimiento}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          fechaVencimiento: event.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Moneda</Label>
                    <Select
                      value={formData.moneda}
                      onValueChange={(value) =>
                        setFormData((current) => ({
                          ...current,
                          moneda: value as HDFacturaServicio["moneda"],
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="ARS">ARS</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="MXN">MXN</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="metodoPago">Metodo de pago</Label>
                    <Input
                      id="metodoPago"
                      value={formData.metodoPago}
                      onChange={(event) =>
                        setFormData((current) => ({ ...current, metodoPago: event.target.value }))
                      }
                      placeholder="Transferencia, efectivo, tarjeta..."
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="referenciaPago">Referencia de pago</Label>
                    <Input
                      id="referenciaPago"
                      value={formData.referenciaPago}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          referenciaPago: event.target.value,
                        }))
                      }
                      placeholder="Operacion, recibo o identificador externo"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="notas">Notas</Label>
                    <Textarea
                      id="notas"
                      value={formData.notas}
                      onChange={(event) =>
                        setFormData((current) => ({ ...current, notas: event.target.value }))
                      }
                      rows={4}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="items" className="space-y-4 pt-4">
                <div className="flex flex-wrap gap-2">
                  <Select value="" onValueChange={addServiceItem}>
                    <SelectTrigger className="max-w-md">
                      <SelectValue placeholder="Agregar item desde servicio" />
                    </SelectTrigger>
                    <SelectContent>
                      {servicios
                        .filter((servicio) => servicio.estado === "activo")
                        .map((servicio) => (
                          <SelectItem key={servicio.id} value={servicio.id}>
                            {servicio.codigo} · {servicio.nombre}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setItems((current) => [...current, createEmptyItem()])}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Item manual
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descripcion</TableHead>
                      <TableHead className="text-right">Cant.</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-right">Desc. %</TableHead>
                      <TableHead className="text-right">Imp. %</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                          La factura todavia no tiene renglones.
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Input
                              value={item.descripcion}
                              onChange={(event) =>
                                updateItem(item.id, "descripcion", event.target.value)
                              }
                              placeholder="Descripcion del servicio o trabajo"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              className="ml-auto w-20 text-right"
                              type="number"
                              min={1}
                              step={1}
                              value={item.cantidad}
                              onChange={(event) =>
                                updateItem(
                                  item.id,
                                  "cantidad",
                                  Math.max(1, Number(event.target.value) || 1)
                                )
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              className="ml-auto w-28 text-right"
                              type="number"
                              min={0}
                              step={0.01}
                              value={item.precioUnitario}
                              onChange={(event) =>
                                updateItem(
                                  item.id,
                                  "precioUnitario",
                                  Number(event.target.value) || 0
                                )
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              className="ml-auto w-24 text-right"
                              type="number"
                              min={0}
                              max={100}
                              step={0.01}
                              value={item.descuento}
                              onChange={(event) =>
                                updateItem(item.id, "descuento", Number(event.target.value) || 0)
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              className="ml-auto w-24 text-right"
                              type="number"
                              min={0}
                              max={100}
                              step={0.01}
                              value={item.impuesto}
                              onChange={(event) =>
                                updateItem(item.id, "impuesto", Number(event.target.value) || 0)
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.total, formData.moneda)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="totales" className="space-y-4 pt-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="descuento">Descuento de cabecera</Label>
                    <Input
                      id="descuento"
                      type="number"
                      min={0}
                      step={0.01}
                      value={formData.descuento}
                      onChange={(event) =>
                        setFormData((current) => ({ ...current, descuento: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="impuestos">Impuestos adicionales</Label>
                    <Input
                      id="impuestos"
                      type="number"
                      min={0}
                      step={0.01}
                      value={formData.impuestos}
                      onChange={(event) =>
                        setFormData((current) => ({ ...current, impuestos: event.target.value }))
                      }
                    />
                  </div>
                </div>

                <Card>
                  <CardContent className="space-y-3 pt-6 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(totals.subtotal, formData.moneda)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Impuestos</span>
                      <span>{formatCurrency(totals.impuestos, formData.moneda)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-3 text-base font-semibold">
                      <span>Total</span>
                      <span>{formatCurrency(totals.total, formData.moneda)}</span>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="legado" className="pt-4">
                <Card>
                  <CardContent className="pt-6 text-sm text-muted-foreground">
                    Queda reservada la segunda fase para prorrateo contra contratos, facturacion
                    recurrente, conciliacion con ordenes de servicio y automatizacion de
                    vencimientos o cobranzas.
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando..." : editingFactura ? "Guardar cambios" : "Crear factura"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedFactura?.numero ?? "Detalle de factura"}</DialogTitle>
            <DialogDescription>
              {selectedFactura
                ? (clientes.find((cliente) => cliente.id === selectedFactura.clienteId)?.nombre ??
                  selectedFactura.clienteId)
                : "Sin seleccion"}
            </DialogDescription>
          </DialogHeader>

          {selectedFactura ? (
            <Tabs defaultValue="principal" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="principal">Principal</TabsTrigger>
                <TabsTrigger value="items">Items</TabsTrigger>
                <TabsTrigger value="totales">Totales</TabsTrigger>
                <TabsTrigger value="legado">Legado</TabsTrigger>
              </TabsList>

              <TabsContent value="principal" className="space-y-4 pt-4">
                <DetailFieldGrid fields={detailFields} />
              </TabsContent>

              <TabsContent value="items" className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descripcion</TableHead>
                      <TableHead className="text-right">Cant.</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-right">Desc.</TableHead>
                      <TableHead className="text-right">Imp.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedFactura.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                          La factura no tiene items registrados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      selectedFactura.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.descripcion}</TableCell>
                          <TableCell className="text-right">{item.cantidad}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.precioUnitario, selectedFactura.moneda)}
                          </TableCell>
                          <TableCell className="text-right">{item.descuento}%</TableCell>
                          <TableCell className="text-right">{item.impuesto}%</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.total, selectedFactura.moneda)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="totales" className="pt-4">
                <Card>
                  <CardContent className="space-y-3 pt-6 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>
                        {formatCurrency(selectedFactura.subtotal, selectedFactura.moneda)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Descuento</span>
                      <span>
                        {formatCurrency(selectedFactura.descuento, selectedFactura.moneda)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Impuestos</span>
                      <span>
                        {formatCurrency(selectedFactura.impuestos, selectedFactura.moneda)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-3 text-base font-semibold">
                      <span>Total</span>
                      <span>{formatCurrency(selectedFactura.total, selectedFactura.moneda)}</span>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="legado" className="pt-4">
                <Card>
                  <CardContent className="pt-6 text-sm text-muted-foreground">
                    El legado contemplaba recurrentes, consumo de horas, consolidacion por contrato
                    y conciliacion automatica de cobranzas. Esta vista ya deja estable la factura de
                    servicios con datos persistidos.
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Cerrar
            </Button>
            {selectedFactura ? (
              <>
                {selectedFactura.estado === "borrador" && (
                  <Button onClick={() => void handleStatusChange(selectedFactura, "emitida")}>
                    <Send className="mr-2 h-4 w-4" />
                    Emitir
                  </Button>
                )}
                {selectedFactura.estado === "emitida" && (
                  <Button onClick={() => void handleStatusChange(selectedFactura, "pagada")}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Marcar pagada
                  </Button>
                )}
                <Button variant="outline" onClick={() => openEdit(selectedFactura)}>
                  <Save className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              </>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar factura</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Se eliminara permanentemente la factura ${deleteTarget.numero}.`
                : "Confirmar eliminacion."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
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

export default function FacturacionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          Cargando...
        </div>
      }
    >
      <FacturacionContent />
    </Suspense>
  )
}
