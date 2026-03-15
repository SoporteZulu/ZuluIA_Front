"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import {
  Search,
  PackageCheck,
  Truck,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react"
import { useOrdenesCompra } from "@/lib/hooks/useOrdenesCompra"
import { useProveedores } from "@/lib/hooks/useTerceros"
import type { OrdenCompra } from "@/lib/types/configuracion"

const ESTADO_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  PENDIENTE: { label: "Pendiente", variant: "secondary", icon: Clock },
  RECIBIDA: { label: "Recibida", variant: "default", icon: CheckCircle2 },
  CANCELADA: { label: "Cancelada", variant: "destructive", icon: XCircle },
}

export default function RecepcionesPage() {
  const { ordenes, loading, error, estado, setEstado, recibir, refetch } = useOrdenesCompra()
  const { terceros: proveedores } = useProveedores()

  const [searchTerm, setSearchTerm] = useState("")
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [detailOrder, setDetailOrder] = useState<OrdenCompra | null>(null)

  const getProveedorNombre = useCallback(
    (proveedorId: number) =>
      proveedores.find((p) => p.id === proveedorId)?.razonSocial ?? `ID ${proveedorId}`,
    [proveedores]
  )

  const filteredOrdenes = ordenes.filter((oc) => {
    const nombreProv = getProveedorNombre(oc.proveedorId).toLowerCase()
    const matchSearch =
      searchTerm === "" ||
      String(oc.id).includes(searchTerm) ||
      nombreProv.includes(searchTerm.toLowerCase())
    return matchSearch
  })

  const handleRecibir = async () => {
    if (confirmId === null) return
    setSubmitting(true)
    const ok = await recibir(confirmId)
    setSubmitting(false)
    setConfirmId(null)
    if (ok) refetch()
  }

  const { pendientes, recibidas, canceladas } = {
    pendientes: filteredOrdenes.filter((o) => o.estadoOc === "PENDIENTE"),
    recibidas: filteredOrdenes.filter((o) => o.estadoOc === "RECIBIDA"),
    canceladas: filteredOrdenes.filter((o) => o.estadoOc === "CANCELADA"),
  }



  const OrdenRow = ({ oc }: { oc: OrdenCompra }) => {
    const cfg = ESTADO_CONFIG[oc.estadoOc] ?? { label: oc.estadoOc, variant: "outline" as const, icon: Clock }
    const Icon = cfg.icon
    return (
      <TableRow
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => setDetailOrder(oc)}
      >
        <TableCell className="font-medium">OC-{oc.id}</TableCell>
        <TableCell>{getProveedorNombre(oc.proveedorId)}</TableCell>
        <TableCell>
          {oc.fechaEntregaReq
            ? new Date(oc.fechaEntregaReq).toLocaleDateString("es-AR")
            : "-"}
        </TableCell>
        <TableCell>
          <Badge variant={cfg.variant} className="gap-1">
            <Icon className="h-3 w-3" />
            {cfg.label}
          </Badge>
        </TableCell>
        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
          {oc.estadoOc === "PENDIENTE" && (
            <Button
              size="sm"
              onClick={() => setConfirmId(oc.id)}
            >
              <PackageCheck className="h-4 w-4 mr-1" />
              Recibir
            </Button>
          )}
        </TableCell>
      </TableRow>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recepciones de Mercadería</h1>
          <p className="text-muted-foreground">
            Gestión de recepciones de órdenes de compra
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes de Recepción</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendientes.length}</div>
            <p className="text-xs text-muted-foreground">órdenes en tránsito / por recibir</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recibidas</CardTitle>
            <PackageCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recibidas.length}</div>
            <p className="text-xs text-muted-foreground">confirmadas en sistema</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Canceladas</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{canceladas.length}</div>
            <p className="text-xs text-muted-foreground">órdenes dadas de baja</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID o proveedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="RECIBIDA">Recibida</SelectItem>
                <SelectItem value="CANCELADA">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Órdenes de Compra ({filteredOrdenes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-muted-foreground">Cargando órdenes...</p>
          ) : filteredOrdenes.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No hay órdenes de compra registradas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nro. OC</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Entrega Requerida</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrdenes.map((oc) => (
                  <OrdenRow key={oc.id} oc={oc} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirm recibir dialog */}
      <Dialog open={confirmId !== null} onOpenChange={(open) => { if (!open) setConfirmId(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Recepción</DialogTitle>
            <DialogDescription>
              ¿Confirma que la OC-{confirmId} fue recibida en su totalidad? Esta acción marcará
              la orden como RECIBIDA y no podrá revertirse.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmId(null)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleRecibir} disabled={submitting}>
              <PackageCheck className="h-4 w-4 mr-2" />
              {submitting ? "Procesando..." : "Confirmar Recepción"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={detailOrder !== null} onOpenChange={(open) => { if (!open) setDetailOrder(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle OC-{detailOrder?.id}</DialogTitle>
            <DialogDescription>
              {getProveedorNombre(detailOrder?.proveedorId ?? 0)}
            </DialogDescription>
          </DialogHeader>
          {detailOrder && (
            <div className="grid grid-cols-2 gap-4 text-sm py-2">
              <div>
                <p className="text-muted-foreground">Proveedor</p>
                <p className="font-medium">{getProveedorNombre(detailOrder.proveedorId)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Estado</p>
                <Badge variant={ESTADO_CONFIG[detailOrder.estadoOc]?.variant ?? "outline"}>
                  {ESTADO_CONFIG[detailOrder.estadoOc]?.label ?? detailOrder.estadoOc}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Comprobante ID</p>
                <p className="font-medium">{detailOrder.comprobanteId}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Entrega requerida</p>
                <p className="font-medium">
                  {detailOrder.fechaEntregaReq
                    ? new Date(detailOrder.fechaEntregaReq).toLocaleDateString("es-AR")
                    : "-"}
                </p>
              </div>
              {detailOrder.condicionesEntrega && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Condiciones de entrega</p>
                  <p className="font-medium">{detailOrder.condicionesEntrega}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">Creada</p>
                <p className="font-medium">
                  {new Date(detailOrder.createdAt).toLocaleDateString("es-AR")}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Habilitada</p>
                <p className="font-medium">{detailOrder.habilitada ? "Sí" : "No"}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOrder(null)}>Cerrar</Button>
            {detailOrder?.estadoOc === "PENDIENTE" && (
              <Button onClick={() => { setDetailOrder(null); setConfirmId(detailOrder.id) }}>
                <PackageCheck className="h-4 w-4 mr-2" />
                Recibir
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
