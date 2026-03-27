"use client"

import { useMemo, useState } from "react"
import {
  AlertCircle,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Eye,
  Loader2,
  PackageCheck,
  RefreshCw,
  Search,
  Truck,
  XCircle,
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
import { useComprobantes } from "@/lib/hooks/useComprobantes"
import { useOrdenesCompra } from "@/lib/hooks/useOrdenesCompra"
import { useProveedores } from "@/lib/hooks/useTerceros"
import type { Comprobante } from "@/lib/types/comprobantes"
import type { OrdenCompra } from "@/lib/types/configuracion"
import type { Tercero } from "@/lib/types/terceros"

const estadoVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  PENDIENTE: "secondary",
  RECIBIDA: "default",
  CANCELADA: "destructive",
}

function formatDate(value?: string | null) {
  if (!value) return "-"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"

  return date.toLocaleDateString("es-AR")
}

function formatDateTime(value?: string | null) {
  if (!value) return "-"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"

  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatMoney(value?: number | null) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0))
}

function getDaysOffset(value?: string | null) {
  if (!value) return null

  const targetDate = new Date(value)
  if (Number.isNaN(targetDate.getTime())) return null

  const today = new Date()
  targetDate.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)

  return Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function getDeliveryStatus(order: OrdenCompra) {
  if (!order.fechaEntregaReq) {
    return {
      label: "Sin fecha requerida",
      detail: "La orden no informa compromiso de entrega.",
    }
  }

  const offset = getDaysOffset(order.fechaEntregaReq)
  if (offset === null) {
    return {
      label: "Fecha inválida",
      detail: "La fecha requerida no pudo interpretarse.",
    }
  }

  if (offset < 0) {
    return {
      label: `Vencida ${Math.abs(offset)} d`,
      detail: `La recepción quedó pendiente hace ${Math.abs(offset)} días.`,
    }
  }

  if (offset === 0) {
    return {
      label: "Entrega hoy",
      detail: "La orden requiere ingreso en la fecha actual.",
    }
  }

  return {
    label: `En ${offset} d`,
    detail: `La entrega está comprometida para dentro de ${offset} días.`,
  }
}

function getOperationalStatus(order: OrdenCompra) {
  if (order.estadoOc === "CANCELADA") {
    return {
      label: "Fuera de circuito",
      detail: "La orden fue cancelada y no debe ingresar mercadería.",
    }
  }

  if (order.estadoOc === "RECIBIDA") {
    return {
      label: "Recepción confirmada",
      detail: "La orden ya cerró el circuito de ingreso en la API actual.",
    }
  }

  if (!order.habilitada) {
    return {
      label: "Pendiente bloqueada",
      detail: "La orden está pendiente pero no habilitada para recibir.",
    }
  }

  return {
    label: "Pendiente habilitada",
    detail: "La orden puede procesarse como recepción operativa.",
  }
}

function getDocumentStatus(comprobante?: Comprobante | null) {
  if (!comprobante) {
    return {
      label: "Sin documento visible",
      detail: "El comprobante base no está en la consulta actual de compras.",
    }
  }

  if (comprobante.estado === "ANULADO") {
    return {
      label: "Documento anulado",
      detail: "El comprobante vinculado quedó fuera del circuito documental.",
    }
  }

  if ((comprobante.saldo ?? 0) > 0) {
    return {
      label: "Saldo pendiente",
      detail: "El documento aún conserva saldo abierto en compras.",
    }
  }

  return {
    label: comprobante.estado,
    detail: "El comprobante está visible y cierra su lectura documental.",
  }
}

function formatProviderAddress(provider?: Tercero | null) {
  if (!provider) return "Sin domicilio visible"

  const parts = [
    [provider.calle, provider.nro].filter(Boolean).join(" "),
    provider.piso ? `Piso ${provider.piso}` : null,
    provider.dpto ? `Dto ${provider.dpto}` : null,
    provider.localidadDescripcion,
    provider.codigoPostal,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(" · ") : "Sin domicilio visible"
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

export default function RecepcionesPage() {
  const { ordenes, loading, error, estado, setEstado, getById, recibir, cancelar, refetch } =
    useOrdenesCompra()
  const { terceros: proveedores } = useProveedores()
  const { comprobantes } = useComprobantes({ esCompra: true })

  const [search, setSearch] = useState("")
  const [selectedOrder, setSelectedOrder] = useState<OrdenCompra | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<number | null>(null)

  const getProveedor = (proveedorId: number) =>
    proveedores.find((item) => item.id === proveedorId) ?? null

  const getProveedorLabel = (proveedorId: number) =>
    getProveedor(proveedorId)?.razonSocial ?? `Proveedor #${proveedorId}`

  const getComprobante = (comprobanteId: number) =>
    comprobantes.find((item) => item.id === comprobanteId) ?? null

  const proveedorById = useMemo(
    () => new Map(proveedores.map((item) => [item.id, item])),
    [proveedores]
  )
  const comprobanteById = useMemo(
    () => new Map(comprobantes.map((item) => [item.id, item])),
    [comprobantes]
  )

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase()
    return ordenes.filter((order) => {
      if (!term) return true

      const proveedor = proveedorById.get(order.proveedorId) ?? null
      const proveedorLabel = proveedor?.razonSocial ?? `Proveedor #${order.proveedorId}`
      const comprobante = comprobanteById.get(order.comprobanteId) ?? null

      return (
        String(order.id).includes(term) ||
        String(order.comprobanteId).includes(term) ||
        proveedorLabel.toLowerCase().includes(term) ||
        (order.condicionesEntrega ?? "").toLowerCase().includes(term) ||
        (proveedor?.nroDocumento ?? "").toLowerCase().includes(term) ||
        (comprobante?.nroComprobante ?? "").toLowerCase().includes(term)
      )
    })
  }, [comprobanteById, ordenes, proveedorById, search])

  const pendientes = ordenes.filter((order) => order.estadoOc === "PENDIENTE").length
  const recibidas = ordenes.filter((order) => order.estadoOc === "RECIBIDA").length
  const canceladas = ordenes.filter((order) => order.estadoOc === "CANCELADA").length
  const vencidas = ordenes.filter((order) => {
    const daysOffset = getDaysOffset(order.fechaEntregaReq)
    return order.estadoOc === "PENDIENTE" && daysOffset !== null && daysOffset < 0
  }).length
  const conCondiciones = ordenes.filter((order) => Boolean(order.condicionesEntrega?.trim())).length
  const conDocumentoVisible = ordenes.filter((order) =>
    Boolean(getComprobante(order.comprobanteId))
  ).length

  const selectedProveedor = selectedOrder ? getProveedor(selectedOrder.proveedorId) : null
  const selectedComprobante = selectedOrder ? getComprobante(selectedOrder.comprobanteId) : null
  const selectedOperationalStatus = selectedOrder ? getOperationalStatus(selectedOrder) : null
  const selectedDeliveryStatus = selectedOrder ? getDeliveryStatus(selectedOrder) : null
  const selectedDocumentStatus = selectedOrder ? getDocumentStatus(selectedComprobante) : null

  const openDetail = async (order: OrdenCompra) => {
    setActionError(null)
    const detail = await getById(order.id)
    setSelectedOrder(detail ?? order)
    setIsDetailOpen(true)
  }

  const handleReceive = async (order: OrdenCompra) => {
    setProcessingId(order.id)
    setActionError(null)

    const ok = await recibir(order.id)
    if (!ok) {
      setActionError(`No se pudo registrar la recepción de la orden ${order.id}.`)
      setProcessingId(null)
      return
    }

    await refetch()
    if (selectedOrder?.id === order.id) {
      const detail = await getById(order.id)
      setSelectedOrder(detail)
    }
    setProcessingId(null)
  }

  const handleCancel = async (order: OrdenCompra) => {
    setProcessingId(order.id)
    setActionError(null)

    const ok = await cancelar(order.id)
    if (!ok) {
      setActionError(`No se pudo cancelar la orden ${order.id}.`)
      setProcessingId(null)
      return
    }

    await refetch()
    if (selectedOrder?.id === order.id) {
      const detail = await getById(order.id)
      setSelectedOrder(detail)
    }
    setProcessingId(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recepciones de mercancía</h1>
          <p className="text-muted-foreground mt-1">
            Consola operativa sobre órdenes de compra. Este módulo hoy permite consultar, recibir y
            cancelar recepciones reales; el alta sigue dependiendo del flujo de compras.
          </p>
        </div>

        <Button variant="outline" onClick={() => void refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {(error || actionError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Recepciones</AlertTitle>
          <AlertDescription>{actionError ?? error}</AlertDescription>
        </Alert>
      )}

      <Alert>
        <Truck className="h-4 w-4" />
        <AlertTitle>Alcance actual del backend</AlertTitle>
        <AlertDescription>
          La creación manual de recepciones no está expuesta por la API vigente. La recepción se
          registra sobre órdenes de compra ya existentes mediante las acciones soportadas abajo.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Órdenes visibles"
          value={ordenes.length}
          description="Resultado del filtro backend por estado"
          icon={<Truck className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Pendientes"
          value={pendientes}
          description="Listas para recepción"
          icon={<PackageCheck className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Recibidas"
          value={recibidas}
          description="Procesadas correctamente"
          icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Canceladas"
          value={canceladas}
          description="Fuera de circuito operativo"
          icon={<XCircle className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Pendientes vencidas"
          value={vencidas}
          description="Requieren seguimiento de entrega"
          icon={<CalendarClock className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-4 w-4" /> Operación vigente
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {pendientes} órdenes siguen abiertas para ingreso y {conDocumentoVisible} ya pueden
            leerse con documento base visible dentro del frontend actual.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4" /> Lectura de recepción
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {conCondiciones} órdenes informan condiciones de entrega. Eso permite recuperar parte
            del contexto logístico que en el sistema viejo se veía junto al remito de compra.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" /> Alcance actual
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            El alta y la recepción parcial todavía no están expuestas por esta API. La consola se
            enfoca en legajo, trazabilidad y cierre operativo de órdenes existentes.
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros operativos</CardTitle>
          <CardDescription>
            El estado consulta backend. La búsqueda local ayuda a ubicar proveedor, comprobante u
            observaciones dentro del lote descargado.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_220px]">
          <div className="space-y-2">
            <Label>Buscar orden</Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="ID, comprobante, proveedor o condición"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Estado</Label>
            <Select
              value={estado || "todos"}
              onValueChange={(value) => setEstado(value === "todos" ? "" : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="RECIBIDA">Recibida</SelectItem>
                <SelectItem value="CANCELADA">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Órdenes de recepción</CardTitle>
          <CardDescription>{filteredOrders.length} registros en la vista actual</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Orden</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Comprobante</TableHead>
                <TableHead>Alta</TableHead>
                <TableHead>Entrega requerida</TableHead>
                <TableHead>Circuito</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Condiciones</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    <div className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando órdenes de compra...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    No hay órdenes para los filtros actuales.
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => {
                  const busy = processingId === order.id
                  const proveedor = getProveedor(order.proveedorId)
                  const comprobante = getComprobante(order.comprobanteId)
                  const deliveryStatus = getDeliveryStatus(order)
                  const operationalStatus = getOperationalStatus(order)

                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">#{order.id}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div>{getProveedorLabel(order.proveedorId)}</div>
                          <p className="text-xs text-muted-foreground">
                            {proveedor?.nroDocumento
                              ? `CUIT ${proveedor.nroDocumento}`
                              : "Sin CUIT visible"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div>{comprobante?.nroComprobante ?? `#${order.comprobanteId}`}</div>
                          <p className="text-xs text-muted-foreground">
                            {comprobante?.tipoComprobanteDescripcion ?? "Documento base"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(order.createdAt)}</TableCell>
                      <TableCell>{formatDate(order.fechaEntregaReq)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{operationalStatus.label}</div>
                          <p className="text-xs text-muted-foreground">{deliveryStatus.label}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={estadoVariant[order.estadoOc] ?? "outline"}>
                          {order.estadoOc}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {order.condicionesEntrega ?? "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void openDetail(order)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver
                          </Button>
                          {order.estadoOc === "PENDIENTE" && (
                            <>
                              <Button
                                size="sm"
                                disabled={busy}
                                onClick={() => void handleReceive(order)}
                              >
                                {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                Recibir
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() => void handleCancel(order)}
                              >
                                Cancelar
                              </Button>
                            </>
                          )}
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

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Orden de recepción #{selectedOrder?.id}
            </DialogTitle>
            <DialogDescription>
              Proveedor: {selectedOrder ? getProveedorLabel(selectedOrder.proveedorId) : "-"}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <Tabs defaultValue="general" className="py-2">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="proveedor">Proveedor</TabsTrigger>
                <TabsTrigger value="circuito">Circuito</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4">
                <DetailFieldGrid
                  fields={[
                    { label: "Estado", value: selectedOrder.estadoOc },
                    {
                      label: "Comprobante base",
                      value:
                        selectedComprobante?.nroComprobante ?? `#${selectedOrder.comprobanteId}`,
                    },
                    {
                      label: "Entrega requerida",
                      value: formatDate(selectedOrder.fechaEntregaReq),
                    },
                    { label: "Alta de orden", value: formatDateTime(selectedOrder.createdAt) },
                    {
                      label: "Recepción habilitada",
                      value: selectedOrder.habilitada ? "Sí" : "No",
                    },
                    {
                      label: "Condiciones",
                      value: selectedOrder.condicionesEntrega ?? "Sin condiciones informadas",
                    },
                  ]}
                />
              </TabsContent>

              <TabsContent value="proveedor" className="space-y-4">
                <DetailFieldGrid
                  fields={[
                    {
                      label: "Razón social",
                      value:
                        selectedProveedor?.razonSocial ??
                        getProveedorLabel(selectedOrder.proveedorId),
                    },
                    {
                      label: "Nombre comercial",
                      value: selectedProveedor?.nombreFantasia ?? "Sin nombre comercial",
                    },
                    {
                      label: "CUIT / Documento",
                      value: selectedProveedor?.nroDocumento ?? "Sin documento visible",
                    },
                    {
                      label: "Condición IVA",
                      value: selectedProveedor?.condicionIvaDescripcion ?? "Sin condición visible",
                    },
                    {
                      label: "Contacto",
                      value:
                        selectedProveedor?.telefono ??
                        selectedProveedor?.celular ??
                        "Sin teléfono visible",
                    },
                    { label: "Correo", value: selectedProveedor?.email ?? "Sin correo visible" },
                    { label: "Domicilio", value: formatProviderAddress(selectedProveedor) },
                    {
                      label: "Observación",
                      value: selectedProveedor?.observacion ?? "Sin observaciones visibles",
                    },
                  ]}
                />
              </TabsContent>

              <TabsContent value="circuito" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ClipboardList className="h-4 w-4" /> Estado operativo
                    </CardTitle>
                    <CardDescription>{selectedOperationalStatus?.detail}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DetailFieldGrid
                      fields={[
                        {
                          label: "Circuito recepción",
                          value: selectedOperationalStatus?.label ?? "-",
                        },
                        {
                          label: "Compromiso entrega",
                          value: selectedDeliveryStatus?.label ?? "-",
                        },
                        {
                          label: "Lectura documental",
                          value: selectedDocumentStatus?.label ?? "-",
                        },
                        {
                          label: "Saldo documento",
                          value: formatMoney(selectedComprobante?.saldo),
                        },
                        {
                          label: "Estado documento",
                          value: selectedComprobante?.estado ?? "No visible",
                        },
                        {
                          label: "Fecha comprobante",
                          value: formatDate(selectedComprobante?.fecha),
                        },
                      ]}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Building2 className="h-4 w-4" /> Contexto de ingreso
                    </CardTitle>
                    <CardDescription>{selectedDocumentStatus?.detail}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <p>{selectedDeliveryStatus?.detail}</p>
                    <p>
                      {selectedOrder.condicionesEntrega
                        ? `Condiciones informadas: ${selectedOrder.condicionesEntrega}`
                        : "La orden no informa condiciones adicionales de entrega en la API actual."}
                    </p>
                    <p>
                      {selectedComprobante?.observacion
                        ? `Observación del documento: ${selectedComprobante.observacion}`
                        : "El comprobante vinculado no expone observaciones adicionales en esta consulta."}
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            {selectedOrder?.estadoOc === "PENDIENTE" && (
              <>
                <Button
                  disabled={processingId === selectedOrder.id}
                  onClick={() => void handleReceive(selectedOrder)}
                >
                  {processingId === selectedOrder.id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Recibir orden
                </Button>
                <Button
                  variant="outline"
                  disabled={processingId === selectedOrder.id}
                  onClick={() => void handleCancel(selectedOrder)}
                >
                  Cancelar orden
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
