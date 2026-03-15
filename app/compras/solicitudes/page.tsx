"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Plus,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  FileText,
  AlertCircle,
  Bot,
  User,
} from "lucide-react"
import type { PurchaseRequest, PurchaseRequestItem } from "@/lib/compras-types"
import { useProveedores } from "@/lib/hooks/useTerceros"
import { useItems } from "@/lib/hooks/useItems"

const estadoBadgeVariant = {
  pendiente: "secondary",
  aprobada: "default",
  convertida_oc: "default",
  rechazada: "destructive",
  cancelada: "secondary",
}

export default function SolicitudesCompraPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const { terceros: proveedores } = useProveedores()
  const { items } = useItems()
  const [requests, setRequests] = useState<PurchaseRequest[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterEstado, setFilterEstado] = useState<string>("todos")
  const [filterOrigen, setFilterOrigen] = useState<string>("todos")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [detailRequest, setDetailRequest] = useState<PurchaseRequest | null>(null)

  // Form state
  const [formData, setFormData] = useState<Partial<PurchaseRequest>>({
    codigo: "",
    origen: "manual",
    estado: "pendiente",
    fechaCreacion: new Date(),
    proveedorSugeridoId: "",
    usuarioSolicitanteId: "user-001",
    motivo: "",
    prioridad: "normal",
    items: [],
  })

  const [formItems, setFormItems] = useState<PurchaseRequestItem[]>([])

  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesEstado = filterEstado === "todos" || request.estado === filterEstado
    const matchesOrigen = filterOrigen === "todos" || request.origen === filterOrigen
    return matchesSearch && matchesEstado && matchesOrigen
  })

  const handleNew = () => {
    setFormData({
      codigo: `REQ-2024-${String(requests.length + 1).padStart(3, '0')}`,
      origen: "manual",
      estado: "pendiente",
      fechaCreacion: new Date(),
      proveedorSugeridoId: "",
      usuarioSolicitanteId: "user-001",
      motivo: "",
      prioridad: "normal",
      items: [],
    })
    setFormItems([])
    setIsFormOpen(true)
  }

  const handleViewDetail = (request: PurchaseRequest) => {
    setDetailRequest(request)
    setIsDetailOpen(true)
  }

  const addItem = () => {
    const newItem: PurchaseRequestItem = {
      id: `req-item-${Date.now()}`,
      solicitudId: formData.codigo || "",
      productoId: "",
      cantidadSolicitada: 1,
      cantidadAprobada: 0,
      motivo: "",
    }
    setFormItems([...formItems, newItem])
  }

  const updateItem = (index: number, field: keyof PurchaseRequestItem, value: any) => {
    const updated = [...formItems]
    updated[index] = { ...updated[index], [field]: value }
    setFormItems(updated)
  }

  const removeItem = (index: number) => {
    setFormItems(formItems.filter((_, i) => i !== index))
  }

  const handleSaveRequest = () => {
    const newRequest: PurchaseRequest = {
      ...formData as PurchaseRequest,
      items: formItems,
      id: `req-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    setRequests([...requests, newRequest])
    setIsFormOpen(false)
  }

  const handleApprove = (requestId: string) => {
    setRequests(requests.map(r => 
      r.id === requestId 
        ? { ...r, estado: "aprobada" as const, updatedAt: new Date() }
        : r
    ))
    setIsDetailOpen(false)
  }

  const handleReject = (requestId: string) => {
    setRequests(requests.map(r => 
      r.id === requestId 
        ? { ...r, estado: "rechazada" as const, updatedAt: new Date() }
        : r
    ))
    setIsDetailOpen(false)
  }

  const handleConvertToOC = (requestId: string) => {
    setRequests(requests.map(r => 
      r.id === requestId 
        ? { ...r, estado: "convertida_oc" as const, updatedAt: new Date() }
        : r
    ))
    setIsDetailOpen(false)
    // En una implementación real, aquí se crearía la OC
    router.push('/compras/ordenes')
  }

  const getSupplierName = (supplierId?: string) => {
    if (!supplierId) return "No asignado"
    return proveedores.find(p => String(p.id) === supplierId)?.razonSocial || "N/A"
  }

  const getProductName = (productId: string) => {
    return items.find(i => String(i.id) === productId)?.descripcion || "N/A"
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Solicitudes de Compra</h1>
          <p className="text-muted-foreground">
            Gestión de requisiciones y reabastecimiento automático
          </p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Solicitud
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {requests.filter(r => r.estado === 'pendiente').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Esperando aprobación</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Aprobadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {requests.filter(r => r.estado === 'aprobada').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Listas para OC</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Automáticas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {requests.filter(r => r.origen === 'automatico').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Reabastecimiento auto</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Manuales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {requests.filter(r => r.origen === 'manual').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Creadas manualmente</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={filterOrigen} onValueChange={setFilterOrigen}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Origen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="automatico">Automático</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="aprobada">Aprobada</SelectItem>
                <SelectItem value="convertida_oc">Convertida a OC</SelectItem>
                <SelectItem value="rechazada">Rechazada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Solicitudes ({filteredRequests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Proveedor Sugerido</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>Ítems</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((request) => (
                <TableRow
                  key={request.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleViewDetail(request)}
                >
                  <TableCell className="font-medium">{request.codigo}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {request.origen === "automatico" ? (
                        <Bot className="h-4 w-4 text-blue-600" />
                      ) : (
                        <User className="h-4 w-4 text-gray-600" />
                      )}
                      <span className="capitalize">{request.origen}</span>
                    </div>
                  </TableCell>
                  <TableCell>{new Date(request.fechaCreacion).toLocaleDateString('es-AR')}</TableCell>
                  <TableCell>{getSupplierName(request.proveedorSugeridoId)}</TableCell>
                  <TableCell>
                    <Badge variant={
                      request.prioridad === "critica" ? "destructive" :
                      request.prioridad === "urgente" ? "default" : "secondary"
                    }>
                      {request.prioridad}
                    </Badge>
                  </TableCell>
                  <TableCell>{request.items.length}</TableCell>
                  <TableCell>
                    <Badge variant={estadoBadgeVariant[request.estado] as any}>
                      {request.estado.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Solicitud de Compra</DialogTitle>
            <DialogDescription>
              Complete la información de los productos a solicitar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código</Label>
                <Input
                  id="codigo"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prioridad">Prioridad</Label>
                <Select
                  value={formData.prioridad}
                  onValueChange={(value: any) => setFormData({ ...formData, prioridad: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                    <SelectItem value="critica">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="proveedorSugerido">Proveedor Sugerido</Label>
              <Select
                value={formData.proveedorSugeridoId}
                onValueChange={(value) => setFormData({ ...formData, proveedorSugeridoId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un proveedor (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {proveedores.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.razonSocial}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo / Justificación</Label>
              <Textarea
                id="motivo"
                value={formData.motivo}
                onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                rows={3}
                placeholder="Descripción del motivo de la solicitud..."
              />
            </div>

            {/* Items */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <Label>Productos Solicitados</Label>
                <Button onClick={addItem} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Producto
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[300px]">Producto</TableHead>
                    <TableHead>Cantidad Solicitada</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formItems.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Select
                          value={item.productoId}
                          onValueChange={(value) => updateItem(index, 'productoId', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione producto" />
                          </SelectTrigger>
                          <SelectContent>
                            {items.map((item) => (
                              <SelectItem key={item.id} value={String(item.id)}>
                                {item.descripcion} ({item.codigo})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.cantidadSolicitada}
                          onChange={(e) => updateItem(index, 'cantidadSolicitada', Number(e.target.value))}
                          min="1"
                          className="w-32"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.motivo || ''}
                          onChange={(e) => updateItem(index, 'motivo', e.target.value)}
                          placeholder="Motivo específico..."
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                        >
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {formItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No hay productos agregados. Haga clic en "Agregar Producto" para comenzar.
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveRequest} disabled={formItems.length === 0}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Crear Solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalle de Solicitud</DialogTitle>
            <DialogDescription>
              {detailRequest?.codigo}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Origen:</span>
                <div className="flex items-center gap-2 mt-1">
                  {detailRequest?.origen === "automatico" ? (
                    <>
                      <Bot className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">Reabastecimiento Automático</span>
                    </>
                  ) : (
                    <>
                      <User className="h-4 w-4 text-gray-600" />
                      <span className="font-medium">Solicitud Manual</span>
                    </>
                  )}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Fecha Creación:</span>
                <p className="font-medium mt-1">
                  {detailRequest ? new Date(detailRequest.fechaCreacion).toLocaleDateString('es-AR') : '-'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Proveedor Sugerido:</span>
                <p className="font-medium mt-1">
                  {detailRequest && getSupplierName(detailRequest.proveedorSugeridoId)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Prioridad:</span>
                <Badge variant={
                  detailRequest?.prioridad === "critica" ? "destructive" :
                  detailRequest?.prioridad === "urgente" ? "default" : "secondary"
                } className="ml-2 mt-1">
                  {detailRequest?.prioridad}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Estado:</span>
                <Badge variant={detailRequest ? estadoBadgeVariant[detailRequest.estado] as any : "secondary"} className="ml-2 mt-1">
                  {detailRequest?.estado.replace('_', ' ')}
                </Badge>
              </div>
            </div>

            {detailRequest?.motivo && (
              <div>
                <h4 className="font-semibold mb-2">Motivo / Justificación</h4>
                <p className="text-sm text-muted-foreground">{detailRequest.motivo}</p>
              </div>
            )}

            <div>
              <h4 className="font-semibold mb-3">Productos Solicitados</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Cantidad Solicitada</TableHead>
                    <TableHead>Cantidad Aprobada</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailRequest?.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{getProductName(item.productoId)}</TableCell>
                      <TableCell>{item.cantidadSolicitada}</TableCell>
                      <TableCell className={item.cantidadAprobada > 0 ? "font-medium text-green-600" : ""}>
                        {item.cantidadAprobada || '-'}
                      </TableCell>
                      <TableCell>{item.motivo || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Cerrar
            </Button>
            {detailRequest?.estado === "pendiente" && (
              <>
                <Button variant="destructive" onClick={() => handleReject(detailRequest.id)}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Rechazar
                </Button>
                <Button onClick={() => handleApprove(detailRequest.id)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Aprobar
                </Button>
              </>
            )}
            {detailRequest?.estado === "aprobada" && (
              <Button onClick={() => handleConvertToOC(detailRequest.id)}>
                <FileText className="h-4 w-4 mr-2" />
                Convertir a OC
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
