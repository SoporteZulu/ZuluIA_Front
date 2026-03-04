"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Star,
  Building2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  TrendingUp,
  Download,
} from "lucide-react"
import type { Supplier, SupplierContact, SupplierAddress } from "@/lib/compras-types"
import {
  suppliers as initialSuppliers,
  supplierContacts as initialContacts,
  supplierAddresses as initialAddresses,
  paymentConditions,
} from "@/lib/compras-data"

export default function ProveedoresPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers)
  const [contacts, setContacts] = useState<SupplierContact[]>(initialContacts)
  const [addresses, setAddresses] = useState<SupplierAddress[]>(initialAddresses)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterEstado, setFilterEstado] = useState<string>("todos")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [detailSupplier, setDetailSupplier] = useState<Supplier | null>(null)

  // Form state
  const [formData, setFormData] = useState<Partial<Supplier>>({
    codigo: "",
    razonSocial: "",
    nombreComercial: "",
    cuit: "",
    condicionImpositiva: "responsable_inscripto",
    categoria: [],
    sitioWeb: "",
    estado: "activo",
    proveedorPreferido: false,
    requiereAprobacionEspecial: false,
    rating: 0,
    observaciones: "",
  })

  const filteredSuppliers = suppliers.filter((supplier) => {
    const matchesSearch =
      supplier.razonSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.cuit.includes(searchTerm)
    const matchesEstado = filterEstado === "todos" || supplier.estado === filterEstado
    return matchesSearch && matchesEstado
  })

  const handleNew = () => {
    setSelectedSupplier(null)
    setFormData({
      codigo: `PROV-${String(suppliers.length + 1).padStart(3, '0')}`,
      razonSocial: "",
      nombreComercial: "",
      cuit: "",
      condicionImpositiva: "responsable_inscripto",
      categoria: [],
      sitioWeb: "",
      estado: "activo",
      proveedorPreferido: false,
      requiereAprobacionEspecial: false,
      rating: 0,
      observaciones: "",
    })
    setIsFormOpen(true)
  }

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setFormData(supplier)
    setIsFormOpen(true)
  }

  const handleViewDetail = (supplier: Supplier) => {
    setDetailSupplier(supplier)
    setIsDetailOpen(true)
  }

  const handleSave = () => {
    if (selectedSupplier) {
      // Edit existing
      setSuppliers(suppliers.map(s => s.id === selectedSupplier.id ? { ...selectedSupplier, ...formData, updatedAt: new Date() } : s))
    } else {
      // Create new
      const newSupplier: Supplier = {
        ...formData as Supplier,
        id: `prov-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      setSuppliers([...suppliers, newSupplier])
    }
    setIsFormOpen(false)
  }

  const handleDelete = (id: string) => {
    if (confirm("¿Está seguro de eliminar este proveedor?")) {
      setSuppliers(suppliers.filter(s => s.id !== id))
    }
  }

  const getSupplierContacts = (supplierId: string) => {
    return contacts.filter(c => c.proveedorId === supplierId)
  }

  const getSupplierAddresses = (supplierId: string) => {
    return addresses.filter(a => a.proveedorId === supplierId)
  }

  const renderRating = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Proveedores</h1>
          <p className="text-muted-foreground">
            Gestión completa del maestro de proveedores
          </p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Proveedor
        </Button>
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
                  placeholder="Buscar por razón social, código o CUIT..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="inactivo">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Proveedores ({filteredSuppliers.length})</CardTitle>
          <CardDescription>
            Haga clic en un proveedor para ver el detalle completo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Razón Social</TableHead>
                <TableHead>CUIT</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Condición de Pago</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.map((supplier) => (
                <TableRow
                  key={supplier.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleViewDetail(supplier)}
                >
                  <TableCell className="font-medium">{supplier.codigo}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{supplier.razonSocial}</p>
                      {supplier.nombreComercial && (
                        <p className="text-sm text-muted-foreground">{supplier.nombreComercial}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{supplier.cuit}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {supplier.categoria.slice(0, 2).map((cat, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {cat}
                        </Badge>
                      ))}
                      {supplier.categoria.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{supplier.categoria.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>30 días</TableCell>
                  <TableCell>{renderRating(supplier.rating)}</TableCell>
                  <TableCell>
                    <Badge variant={supplier.estado === "activo" ? "default" : "secondary"}>
                      {supplier.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(supplier)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(supplier.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedSupplier ? "Editar" : "Nuevo"} Proveedor
            </DialogTitle>
            <DialogDescription>
              Complete la información básica del proveedor
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código</Label>
                <Input
                  id="codigo"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cuit">CUIT *</Label>
                <Input
                  id="cuit"
                  value={formData.cuit}
                  onChange={(e) => setFormData({ ...formData, cuit: e.target.value })}
                  placeholder="XX-XXXXXXXX-X"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="razonSocial">Razón Social *</Label>
              <Input
                id="razonSocial"
                value={formData.razonSocial}
                onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nombreComercial">Nombre Comercial</Label>
              <Input
                id="nombreComercial"
                value={formData.nombreComercial}
                onChange={(e) => setFormData({ ...formData, nombreComercial: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="condicionImpositiva">Condición Impositiva</Label>
                <Select
                  value={formData.condicionImpositiva}
                  onValueChange={(value: any) => setFormData({ ...formData, condicionImpositiva: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="responsable_inscripto">Responsable Inscripto</SelectItem>
                    <SelectItem value="monotributista">Monotributista</SelectItem>
                    <SelectItem value="exento">Exento</SelectItem>
                    <SelectItem value="consumidor_final">Consumidor Final</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Select
                  value={formData.estado}
                  onValueChange={(value: any) => setFormData({ ...formData, estado: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sitioWeb">Sitio Web</Label>
              <Input
                id="sitioWeb"
                type="url"
                value={formData.sitioWeb}
                onChange={(e) => setFormData({ ...formData, sitioWeb: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="proveedorPreferido"
                  checked={formData.proveedorPreferido}
                  onCheckedChange={(checked) => setFormData({ ...formData, proveedorPreferido: checked as boolean })}
                />
                <Label htmlFor="proveedorPreferido">Proveedor Preferido</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requiereAprobacionEspecial"
                  checked={formData.requiereAprobacionEspecial}
                  onCheckedChange={(checked) => setFormData({ ...formData, requiereAprobacionEspecial: checked as boolean })}
                />
                <Label htmlFor="requiereAprobacionEspecial">Requiere Aprobación Especial</Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog with Tabs */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-3">
              <Building2 className="h-6 w-6" />
              {detailSupplier?.razonSocial}
            </DialogTitle>
            <DialogDescription>
              Código: {detailSupplier?.codigo} | CUIT: {detailSupplier?.cuit}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
              <TabsTrigger value="historial">Historial</TabsTrigger>
              <TabsTrigger value="evaluacion">Evaluación</TabsTrigger>
              <TabsTrigger value="cuenta">Cuenta Corriente</TabsTrigger>
              <TabsTrigger value="documentos">Documentos</TabsTrigger>
            </TabsList>

            {/* Tab 1: Información General */}
            <TabsContent value="general" className="space-y-6">
              <div className="grid gap-6">
                {/* Datos Básicos */}
                <Card>
                  <CardHeader>
                    <CardTitle>Datos Básicos</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Razón Social</Label>
                      <p className="font-medium">{detailSupplier?.razonSocial}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Nombre Comercial</Label>
                      <p className="font-medium">{detailSupplier?.nombreComercial || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">CUIT</Label>
                      <p className="font-medium">{detailSupplier?.cuit}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Condición Impositiva</Label>
                      <p className="font-medium capitalize">{detailSupplier?.condicionImpositiva.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Rating</Label>
                      <div className="mt-1">{detailSupplier && renderRating(detailSupplier.rating)}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Estado</Label>
                      <Badge variant={detailSupplier?.estado === "activo" ? "default" : "secondary"} className="mt-1">
                        {detailSupplier?.estado}
                      </Badge>
                    </div>
                    {detailSupplier?.sitioWeb && (
                      <div className="col-span-2">
                        <Label className="text-muted-foreground">Sitio Web</Label>
                        <p>
                          <a href={detailSupplier.sitioWeb} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            {detailSupplier.sitioWeb}
                          </a>
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Contactos */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Contactos</CardTitle>
                    <Button size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {detailSupplier && getSupplierContacts(detailSupplier.id).length > 0 ? (
                      <div className="space-y-3">
                        {getSupplierContacts(detailSupplier.id).map((contact) => (
                          <div key={contact.id} className="flex items-start justify-between p-3 border rounded-lg">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{contact.nombre}</p>
                                {contact.esPrincipal && (
                                  <Badge variant="default" className="text-xs">Principal</Badge>
                                )}
                              </div>
                              {contact.cargo && (
                                <p className="text-sm text-muted-foreground">{contact.cargo}</p>
                              )}
                              <div className="flex items-center gap-4 text-sm">
                                {contact.email && (
                                  <div className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    <span>{contact.email}</span>
                                  </div>
                                )}
                                {contact.telefono && (
                                  <div className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    <span>{contact.telefono}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No hay contactos registrados
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Direcciones */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Direcciones</CardTitle>
                    <Button size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {detailSupplier && getSupplierAddresses(detailSupplier.id).length > 0 ? (
                      <div className="space-y-3">
                        {getSupplierAddresses(detailSupplier.id).map((address) => (
                          <div key={address.id} className="flex items-start justify-between p-3 border rounded-lg">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <Badge variant="outline" className="text-xs capitalize">
                                  {address.tipo}
                                </Badge>
                              </div>
                              <p className="font-medium">
                                {address.calle} {address.numero}
                                {address.piso && `, Piso ${address.piso}`}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {address.ciudad}, {address.provincia} - CP: {address.codigoPostal}
                              </p>
                              <p className="text-sm text-muted-foreground">{address.pais}</p>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No hay direcciones registradas
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tab 2: Catálogo de Productos */}
            <TabsContent value="catalogo">
              <Card>
                <CardHeader>
                  <CardTitle>Catálogo de Productos</CardTitle>
                  <CardDescription>
                    Productos que este proveedor puede suministrar con sus precios
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No hay productos en el catálogo del proveedor
                  </p>
                  <div className="flex justify-center">
                    <Button variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Producto al Catálogo
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 3: Historial de Órdenes */}
            <TabsContent value="historial">
              <Card>
                <CardHeader>
                  <CardTitle>Historial de Órdenes de Compra</CardTitle>
                  <CardDescription>
                    Todas las órdenes emitidas a este proveedor
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Aún no hay órdenes de compra registradas para este proveedor
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 4: Evaluación de Desempeño */}
            <TabsContent value="evaluacion">
              <Card>
                <CardHeader>
                  <CardTitle>Evaluación de Desempeño</CardTitle>
                  <CardDescription>
                    Métricas de rendimiento del proveedor
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-6 border rounded-lg bg-muted/30">
                    <div>
                      <p className="text-sm text-muted-foreground">Rating Actual</p>
                      <div className="flex items-center gap-3 mt-2">
                        {detailSupplier && renderRating(detailSupplier.rating)}
                        <span className="text-2xl font-bold">{detailSupplier?.rating}/5</span>
                      </div>
                    </div>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Evaluación
                    </Button>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Puntualidad</p>
                        <p className="text-2xl font-bold mt-1">95%</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Conformidad</p>
                        <p className="text-2xl font-bold mt-1">98%</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Cumplimiento</p>
                        <p className="text-2xl font-bold mt-1">100%</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground">Tiempo Respuesta</p>
                        <p className="text-2xl font-bold mt-1">2.5 días</p>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 5: Cuenta Corriente */}
            <TabsContent value="cuenta">
              <Card>
                <CardHeader>
                  <CardTitle>Cuenta Corriente</CardTitle>
                  <CardDescription>
                    Movimientos y saldo con el proveedor
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6 p-4 border rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">Saldo Actual</p>
                    <p className="text-3xl font-bold mt-1">$0,00</p>
                  </div>
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No hay movimientos registrados
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 6: Documentos */}
            <TabsContent value="documentos">
              <Card>
                <CardHeader>
                  <CardTitle>Documentos</CardTitle>
                  <CardDescription>
                    Contratos, certificaciones y otros archivos adjuntos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No hay documentos adjuntos
                  </p>
                  <div className="flex justify-center">
                    <Button variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Cargar Documento
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}
