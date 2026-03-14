'use client'

import React, { useState, useRef } from 'react'
import {
  Plus, Search, Edit, Eye, Mail, Phone,
  AlertCircle, RefreshCw, ChevronLeft, ChevronRight, X, Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { useTerceros, useTercerosConfig } from '@/lib/hooks/useTerceros'
import type { Tercero, CreateTerceroDto } from '@/lib/types/terceros'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function activoBadge(activo: boolean) {
  return activo
    ? <Badge variant="secondary" className="bg-green-500/10 text-green-600 text-xs">Activo</Badge>
    : <Badge variant="secondary" className="bg-gray-500/10 text-gray-500 text-xs">Inactivo</Badge>
}

// ─── CustomerForm ─────────────────────────────────────────────────────────────

const EMPTY_FORM: CreateTerceroDto = {
  razonSocial: '',
  nombreFantasia: null,
  nroDocumento: null,
  condicionIvaId: 0,
  esCliente: true,
  esProveedor: false,
  esEmpleado: false,
  calle: null,
  nro: null,
  piso: null,
  dpto: null,
  codigoPostal: null,
  localidadId: null,
  barrioId: null,
  nroIngresosBrutos: null,
  nroMunicipal: null,
  telefono: null,
  celular: null,
  email: null,
  web: null,
  monedaId: null,
  categoriaId: null,
  limiteCredito: null,
  facturable: true,
  cobradorId: null,
  pctComisionCobrador: 0,
  vendedorId: null,
  pctComisionVendedor: 0,
  observacion: null,
}

interface CustomerFormProps {
  customer: Tercero | null
  onClose: () => void
  onSaved: () => void
  createTercero: (dto: CreateTerceroDto) => Promise<boolean>
  updateTercero: (id: number, dto: Partial<CreateTerceroDto>) => Promise<boolean>
}

function CustomerForm({ customer, onClose, onSaved, createTercero, updateTercero }: CustomerFormProps) {
  const { condicionesIva, monedas } = useTercerosConfig()
  const [tab, setTab] = useState('basicos')
  const [form, setForm] = useState<CreateTerceroDto>(
    customer
      ? {
          razonSocial: customer.razonSocial,
          nombreFantasia: customer.nombreFantasia,
          nroDocumento: customer.nroDocumento,
          condicionIvaId: customer.condicionIvaId,
          esCliente: customer.esCliente,
          esProveedor: customer.esProveedor,
          esEmpleado: customer.esEmpleado,
          calle: customer.calle,
          nro: customer.nro,
          piso: customer.piso,
          dpto: customer.dpto,
          codigoPostal: customer.codigoPostal,
          localidadId: customer.localidadId,
          barrioId: customer.barrioId,
          nroIngresosBrutos: customer.nroIngresosBrutos,
          nroMunicipal: customer.nroMunicipal,
          telefono: customer.telefono,
          celular: customer.celular,
          email: customer.email,
          web: customer.web,
          monedaId: customer.monedaId,
          categoriaId: customer.categoriaId,
          limiteCredito: customer.limiteCredito,
          facturable: customer.facturable,
          cobradorId: customer.cobradorId,
          pctComisionCobrador: customer.pctComisionCobrador,
          vendedorId: customer.vendedorId,
          pctComisionVendedor: customer.pctComisionVendedor,
          observacion: customer.observacion,
        }
      : { ...EMPTY_FORM }
  )
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const set = (k: keyof CreateTerceroDto, v: unknown) =>
    setForm((prev) => ({ ...prev, [k]: v }))

  const str = (v: string) => v || null

  const validate = (): string | null => {
    if (!form.razonSocial.trim()) return 'La razón social es requerida'
    if (!form.condicionIvaId) return 'Seleccione una condición IVA'
    return null
  }

  const handleSave = async () => {
    const err = validate()
    if (err) { setFormError(err); return }
    setSaving(true)
    setFormError(null)
    const ok = customer
      ? await updateTercero(customer.id, form)
      : await createTercero(form)
    setSaving(false)
    if (ok) onSaved()
    else setFormError('No se pudo guardar el cliente')
  }

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3 h-auto">
          {[
            { key: 'basicos', label: 'Datos Básicos' },
            { key: 'domicilio', label: 'Domicilio' },
            { key: 'comercial', label: 'Comercial' },
          ].map((t) => (
            <TabsTrigger key={t.key} value={t.key} className="text-xs capitalize py-2">{t.label}</TabsTrigger>
          ))}
        </TabsList>

        {/* Tab 1: Datos Básicos */}
        <TabsContent value="basicos" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Razón Social <span className="text-red-500">*</span></Label>
              <Input placeholder="Empresa SA" value={form.razonSocial} onChange={(e) => set('razonSocial', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Nombre Fantasía</Label>
              <Input placeholder="Nombre de fantasía" value={form.nombreFantasia ?? ''} onChange={(e) => set('nombreFantasia', str(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>CUIT/CUIL</Label>
              <Input placeholder="30-12345678-9" value={form.nroDocumento ?? ''} onChange={(e) => set('nroDocumento', str(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Condición IVA <span className="text-red-500">*</span></Label>
              <Select
                value={form.condicionIvaId ? String(form.condicionIvaId) : ''}
                onValueChange={(v) => set('condicionIvaId', Number(v))}
              >
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {condicionesIva.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.descripcion}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="contacto@empresa.com" value={form.email ?? ''} onChange={(e) => set('email', str(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input placeholder="011-1234-5678" value={form.telefono ?? ''} onChange={(e) => set('telefono', str(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Celular</Label>
              <Input placeholder="11-1234-5678" value={form.celular ?? ''} onChange={(e) => set('celular', str(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Sitio Web</Label>
              <Input placeholder="https://www.empresa.com" value={form.web ?? ''} onChange={(e) => set('web', str(e.target.value))} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Observación</Label>
              <Textarea placeholder="Observaciones..." value={form.observacion ?? ''} onChange={(e) => set('observacion', str(e.target.value))} className="resize-none h-16" />
            </div>
          </div>
          <Separator />
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Switch id="esCliente" checked={form.esCliente} onCheckedChange={(v) => set('esCliente', v)} />
              <Label htmlFor="esCliente">Es Cliente</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="esProveedor" checked={form.esProveedor} onCheckedChange={(v) => set('esProveedor', v)} />
              <Label htmlFor="esProveedor">Es Proveedor</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="esEmpleado" checked={form.esEmpleado} onCheckedChange={(v) => set('esEmpleado', v)} />
              <Label htmlFor="esEmpleado">Es Empleado</Label>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Domicilio */}
        <TabsContent value="domicilio" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2">
              <Label>Calle</Label>
              <Input placeholder="Av. Corrientes" value={form.calle ?? ''} onChange={(e) => set('calle', str(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Número</Label>
              <Input placeholder="1234" value={form.nro ?? ''} onChange={(e) => set('nro', str(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Piso</Label>
              <Input placeholder="8°" value={form.piso ?? ''} onChange={(e) => set('piso', str(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Departamento</Label>
              <Input placeholder="B" value={form.dpto ?? ''} onChange={(e) => set('dpto', str(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Código Postal</Label>
              <Input placeholder="C1043" value={form.codigoPostal ?? ''} onChange={(e) => set('codigoPostal', str(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Nro. Ingresos Brutos</Label>
              <Input placeholder="IB-001" value={form.nroIngresosBrutos ?? ''} onChange={(e) => set('nroIngresosBrutos', str(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Nro. Municipal</Label>
              <Input placeholder="MUN-001" value={form.nroMunicipal ?? ''} onChange={(e) => set('nroMunicipal', str(e.target.value))} />
            </div>
          </div>
        </TabsContent>

        {/* Tab 3: Comercial */}
        <TabsContent value="comercial" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Moneda</Label>
              <Select
                value={form.monedaId ? String(form.monedaId) : '__none__'}
                onValueChange={(v) => set('monedaId', v !== '__none__' ? Number(v) : null)}
              >
                <SelectTrigger><SelectValue placeholder="Seleccionar moneda" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin moneda</SelectItem>
                  {monedas.map((m) => <SelectItem key={m.id} value={String(m.id)}>{m.descripcion} ({m.simbolo})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Límite de Crédito</Label>
              <Input type="number" min={0} placeholder="0" value={form.limiteCredito ?? ''} onChange={(e) => set('limiteCredito', e.target.value ? parseFloat(e.target.value) : null)} />
            </div>
            <div className="space-y-1.5">
              <Label>% Comisión Cobrador</Label>
              <Input type="number" min={0} max={100} step={0.5} value={form.pctComisionCobrador} onChange={(e) => set('pctComisionCobrador', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label>% Comisión Vendedor</Label>
              <Input type="number" min={0} max={100} step={0.5} value={form.pctComisionVendedor} onChange={(e) => set('pctComisionVendedor', parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Switch id="facturable" checked={form.facturable} onCheckedChange={(v) => set('facturable', v)} />
            <Label htmlFor="facturable">Facturable</Label>
          </div>
        </TabsContent>
      </Tabs>

      {formError && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="h-4 w-4" /> {formError}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button variant="outline" onClick={onClose} className="bg-transparent">Cancelar</Button>
        <Button onClick={handleSave} disabled={saving}>
          <Check className="h-4 w-4 mr-2" />
          {saving ? 'Guardando...' : customer ? 'Guardar Cambios' : 'Crear Cliente'}
        </Button>
      </div>
    </div>
  )
}

// ─── Detail Dialog ─────────────────────────────────────────────────────────────

function ClienteDetail({ customer, onClose, onEdit }: { customer: Tercero; onClose: () => void; onEdit: () => void }) {
  const fields = [
    { label: 'Razón Social', value: customer.razonSocial },
    { label: 'Nombre Fantasía', value: customer.nombreFantasia ?? '-' },
    { label: 'CUIT/CUIL', value: customer.nroDocumento ?? '-' },
    { label: 'Condición IVA', value: customer.condicionIvaDescripcion ?? String(customer.condicionIvaId) },
    { label: 'Email', value: customer.email ?? '-' },
    { label: 'Teléfono', value: customer.telefono ?? '-' },
    { label: 'Celular', value: customer.celular ?? '-' },
    { label: 'Sitio Web', value: customer.web ?? '-' },
    { label: 'Calle', value: customer.calle ?? '-' },
    { label: 'Número', value: customer.nro ?? '-' },
    { label: 'Piso/Dpto', value: [customer.piso, customer.dpto].filter(Boolean).join(' ') || '-' },
    { label: 'Código Postal', value: customer.codigoPostal ?? '-' },
    { label: 'Localidad', value: customer.localidadDescripcion ?? (customer.localidadId ? String(customer.localidadId) : '-') },
    { label: 'Nro. IIBB', value: customer.nroIngresosBrutos ?? '-' },
    { label: 'Nro. Municipal', value: customer.nroMunicipal ?? '-' },
    { label: 'Límite de Crédito', value: customer.limiteCredito !== null ? ('$' + customer.limiteCredito.toLocaleString('es-AR')) : 'Sin límite' },
    { label: 'Facturable', value: customer.facturable ? 'Sí' : 'No' },
    { label: 'Observación', value: customer.observacion ?? '-' },
    { label: 'Estado', value: customer.activo ? 'Activo' : 'Inactivo' },
    { label: 'Fecha Alta', value: new Date(customer.createdAt).toLocaleDateString('es-AR') },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {fields.map((f) => (
          <div key={f.label} className="p-3 rounded-lg bg-muted/50">
            <span className="text-xs text-muted-foreground block mb-1">{f.label}</span>
            <p className="font-medium text-sm">{f.value}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap pt-1">
        {customer.esCliente && <Badge variant="outline">Cliente</Badge>}
        {customer.esProveedor && <Badge variant="outline">Proveedor</Badge>}
        {customer.esEmpleado && <Badge variant="outline">Empleado</Badge>}
      </div>
      <DialogFooter className="gap-2 mt-2">
        <Button variant="outline" onClick={onClose} className="bg-transparent">Cerrar</Button>
        <Button onClick={onEdit}>
          <Edit className="h-4 w-4 mr-2" /> Editar Cliente
        </Button>
      </DialogFooter>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ClientesPage() {
  const {
    terceros, loading, error, totalCount, totalPages, page, setPage,
    search, setSearch, createTercero, updateTercero, deleteTercero, refetch,
  } = useTerceros()

  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleSearch = (val: string) => {
    setDebouncedSearch(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setSearch(val), 400)
  }

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Tercero | null>(null)
  const [editingCustomer, setEditingCustomer] = useState<Tercero | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleViewDetail = (c: Tercero) => { setSelectedCustomer(c); setIsDetailOpen(true) }
  const handleEdit = (c: Tercero) => { setEditingCustomer(c); setIsFormOpen(true) }
  const handleDeleteConfirm = (c: Tercero) => { setSelectedCustomer(c); setIsDeleteOpen(true) }

  const handleDelete = async () => {
    if (!selectedCustomer) return
    setDeleting(true)
    await deleteTercero(selectedCustomer.id)
    setDeleting(false)
    setIsDeleteOpen(false)
    refetch()
  }

  const handleSaved = () => {
    setIsFormOpen(false)
    refetch()
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'

  return (
    <div className="space-y-6 pb-6">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">Maestro de clientes y gestión de crédito</p>
        </div>
        <Button onClick={() => { setEditingCustomer(null); setIsFormOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Total Clientes', value: totalCount, color: '' },
          { label: 'Activos', value: terceros.filter((c) => c.activo).length, color: 'text-green-600' },
          { label: 'Inactivos', value: terceros.filter((c) => !c.activo).length, color: 'text-gray-500' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-48">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por razón social o CUIT..."
                  value={debouncedSearch}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            {debouncedSearch && (
              <Button variant="ghost" size="sm" className="bg-transparent" onClick={() => { setDebouncedSearch(''); setSearch('') }}>
                <X className="h-3 w-3 mr-1" /> Limpiar
              </Button>
            )}
          </div>
          {!loading && !error && (
            <p className="text-xs text-muted-foreground mt-2">{totalCount} clientes encontrados</p>
          )}
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent className="pt-0">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Cargando clientes...</span>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center gap-3 py-12">
              <div className="flex items-center gap-2 text-red-500">
                <AlertCircle className="h-5 w-5" />
                <p className="text-sm font-medium">
                  {error.includes('fetch') || error.includes('network') || error.includes('Failed')
                    ? `No se pudo conectar con el servidor. Verificá que el backend esté corriendo en ${apiUrl}.`
                    : error}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={refetch}>
                <RefreshCw className="h-4 w-4 mr-2" /> Reintentar
              </Button>
            </div>
          )}

          {!loading && !error && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Razón Social</TableHead>
                    <TableHead>CUIT/CUIL</TableHead>
                    <TableHead>Condición IVA</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Límite Crédito</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {terceros.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No se encontraron clientes
                      </TableCell>
                    </TableRow>
                  ) : (
                    terceros.map((customer) => (
                      <TableRow
                        key={customer.id}
                        className="cursor-pointer hover:bg-muted/40"
                        onClick={() => handleViewDetail(customer)}
                      >
                        <TableCell>
                          <div className="font-medium text-sm">{customer.razonSocial}</div>
                          {customer.nombreFantasia && (
                            <div className="text-xs text-muted-foreground">{customer.nombreFantasia}</div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{customer.nroDocumento ?? '-'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {customer.condicionIvaDescripcion ?? `IVA ${customer.condicionIvaId}`}
                        </TableCell>
                        <TableCell className="text-xs">
                          {customer.email ? (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {customer.email}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {customer.telefono ? (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {customer.telefono}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {customer.limiteCredito !== null
                            ? ('$' + customer.limiteCredito.toLocaleString('es-AR'))
                            : <span className="text-muted-foreground">Sin límite</span>}
                        </TableCell>
                        <TableCell>{activoBadge(customer.activo)}</TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleViewDetail(customer)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(customer)}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteConfirm(customer)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-xs text-muted-foreground">Página {page} de {totalPages}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                      <ChevronLeft className="h-4 w-4" /> Anterior
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                      Siguiente <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 flex-wrap">
              <span>{selectedCustomer?.razonSocial}</span>
              {selectedCustomer && activoBadge(selectedCustomer.activo)}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {selectedCustomer?.nroDocumento}
              {selectedCustomer?.condicionIvaDescripcion ? (' · ' + selectedCustomer.condicionIvaDescripcion) : ''}
            </p>
          </DialogHeader>
          {selectedCustomer && (
            <ClienteDetail
              customer={selectedCustomer}
              onClose={() => setIsDetailOpen(false)}
              onEdit={() => { setIsDetailOpen(false); handleEdit(selectedCustomer) }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? ('Editar: ' + editingCustomer.razonSocial) : 'Nuevo Cliente'}</DialogTitle>
          </DialogHeader>
          <CustomerForm
            customer={editingCustomer}
            onClose={() => setIsFormOpen(false)}
            onSaved={handleSaved}
            createTercero={createTercero}
            updateTercero={updateTercero}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Desactivar este cliente?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            El cliente <strong>{selectedCustomer?.razonSocial}</strong> será desactivado.
          </p>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} className="bg-transparent">Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Desactivando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
