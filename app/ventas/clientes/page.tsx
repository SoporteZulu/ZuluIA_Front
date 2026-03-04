'use client'

import React, { useState, useMemo } from 'react'
import {
  Plus, Search, Edit, Eye, Mail, Phone, MapPin, DollarSign,
  Building2, CreditCard, History, Users, ChevronDown, X, Check,
  AlertTriangle, TrendingUp, Wallet, AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { customers, invoices, salesOrders, movimientosCC } from '@/lib/sales-data'
import type { Customer } from '@/lib/sales-types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function estadoBadgeVariant(estado: Customer['estado']) {
  const map: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    activo: 'default', inactivo: 'secondary', moroso: 'destructive', bloqueado: 'destructive',
  }
  return map[estado] ?? 'outline'
}

function estadoColor(estado: Customer['estado']) {
  const map: Record<string, string> = {
    activo: 'text-green-600', inactivo: 'text-gray-500', moroso: 'text-orange-600', bloqueado: 'text-red-600',
  }
  return map[estado] ?? ''
}

function creditPct(c: Customer) {
  if (!c.creditoLimite) return 0
  return Math.min(Math.round((c.creditoUtilizado / c.creditoLimite) * 100), 100)
}

function creditBarColor(pct: number) {
  if (pct >= 100) return 'bg-red-500'
  if (pct >= 90) return 'bg-orange-500'
  if (pct >= 80) return 'bg-amber-400'
  return 'bg-green-500'
}

// ─── CustomerForm ─────────────────────────────────────────────────────────────

function CustomerForm({ customer, onClose }: { customer: Customer | null; onClose: () => void }) {
  const [tab, setTab] = useState('basicos')
  const isEditing = !!customer

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-6 h-auto">
          {['basicos', 'contactos', 'direcciones', 'comercial', 'financiero', 'historial'].map((t) => (
            <TabsTrigger key={t} value={t} className="text-xs capitalize py-2">{t === 'basicos' ? 'Datos Básicos' : t.charAt(0).toUpperCase() + t.slice(1)}</TabsTrigger>
          ))}
        </TabsList>

        {/* Tab 1: Datos Básicos */}
        <TabsContent value="basicos" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Razón Social <span className="text-red-500">*</span></Label>
              <Input placeholder="Razón Social SA" defaultValue={customer?.razonSocial} />
            </div>
            <div className="space-y-1.5">
              <Label>Nombre Fantasía</Label>
              <Input placeholder="Nombre de fantasía" defaultValue={customer?.nombreFantasia} />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo Documento <span className="text-red-500">*</span></Label>
              <Select defaultValue={customer?.tipoDocumento ?? 'CUIT'}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CUIT">CUIT</SelectItem>
                  <SelectItem value="CUIL">CUIL</SelectItem>
                  <SelectItem value="DNI">DNI</SelectItem>
                  <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>CUIT/CUIL <span className="text-red-500">*</span></Label>
              <Input placeholder="30-12345678-9" defaultValue={customer?.cuitCuil} />
            </div>
            <div className="space-y-1.5">
              <Label>Condición Impositiva <span className="text-red-500">*</span></Label>
              <Select defaultValue={customer?.condicionImpositiva ?? 'responsable_inscripto'}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="responsable_inscripto">Responsable Inscripto</SelectItem>
                  <SelectItem value="monotributista">Monotributista</SelectItem>
                  <SelectItem value="exento">Exento</SelectItem>
                  <SelectItem value="consumidor_final">Consumidor Final</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Email Principal <span className="text-red-500">*</span></Label>
              <Input type="email" placeholder="contacto@empresa.com" defaultValue={customer?.emailPrincipal} />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input placeholder="011-1234-5678" defaultValue={customer?.telefono} />
            </div>
            <div className="space-y-1.5">
              <Label>Sitio Web</Label>
              <Input placeholder="https://www.empresa.com" defaultValue={customer?.sitioWeb} />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo Cliente <span className="text-red-500">*</span></Label>
              <Select defaultValue={customer?.tipo ?? 'cliente_final'}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead (Prospecto)</SelectItem>
                  <SelectItem value="cliente_final">Cliente Final</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Grupo</Label>
              <Select defaultValue={customer?.grupo ?? 'minorista'}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mayorista">Mayorista</SelectItem>
                  <SelectItem value="minorista">Minorista</SelectItem>
                  <SelectItem value="distribuidor">Distribuidor</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="gobierno">Gobierno</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select defaultValue={customer?.estado ?? 'activo'}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="inactivo">Inactivo</SelectItem>
                  <SelectItem value="moroso">Moroso</SelectItem>
                  <SelectItem value="bloqueado">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Vendedor Asignado</Label>
              <Select defaultValue={customer?.vendedorAsignado ?? ''}>
                <SelectTrigger><SelectValue placeholder="Seleccionar vendedor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Juan Pérez">Juan Pérez</SelectItem>
                  <SelectItem value="María García">María García</SelectItem>
                  <SelectItem value="Carlos Ruiz">Carlos Ruiz</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Códigos Fiscales</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Código Percepción IIBB + Provincia</Label>
                <div className="flex gap-2">
                  <Input placeholder="IB-001" className="flex-1" />
                  <Input placeholder="Provincia" className="flex-1" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Cód. Retención Ganancias</Label>
                <Input placeholder="RG-001" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Cód. Retención IVA</Label>
                <Input placeholder="RIVA-001" />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Contactos */}
        <TabsContent value="contactos" className="mt-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Contactos del cliente</p>
              <Button size="sm" variant="outline" className="bg-transparent">
                <Plus className="h-3 w-3 mr-1" />
                Agregar Contacto
              </Button>
            </div>
            {(customer?.contactos ?? [{ id: 'new', nombreCompleto: '', cargo: '', email: '', celular: '', esPrincipal: true }]).map((c, i) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Contacto {i + 1}</span>
                    {c.esPrincipal && <Badge variant="secondary" className="text-xs">Principal</Badge>}
                  </div>
                  {i > 0 && <Button variant="ghost" size="icon" className="h-6 w-6"><X className="h-3 w-3" /></Button>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nombre Completo <span className="text-red-500">*</span></Label>
                    <Input placeholder="Nombre Apellido" defaultValue={c.nombreCompleto} className="h-8" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cargo</Label>
                    <Input placeholder="Gerente de Compras" defaultValue={c.cargo} className="h-8" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Email <span className="text-red-500">*</span></Label>
                    <Input placeholder="email@empresa.com" defaultValue={c.email} className="h-8" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Celular</Label>
                    <Input placeholder="11-1234-5678" defaultValue={c.celular} className="h-8" />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs">Notas</Label>
                    <Textarea placeholder="Observaciones del contacto..." className="h-16 resize-none" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id={`principal-${i}`} defaultChecked={c.esPrincipal} />
                    <Label htmlFor={`principal-${i}`} className="text-xs">Contacto principal</Label>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab 3: Direcciones */}
        <TabsContent value="direcciones" className="mt-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">Direcciones del cliente</p>
              <Button size="sm" variant="outline" className="bg-transparent">
                <Plus className="h-3 w-3 mr-1" />
                Agregar Dirección
              </Button>
            </div>
            {(customer?.direcciones ?? [{ id: 'new', tipo: 'fiscal' as const, calle: '', numero: '', codigoPostal: '', ciudad: '', provincia: '', pais: 'Argentina', esPrincipal: true }]).map((d, i) => (
              <Card key={d.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Select defaultValue={d.tipo}>
                      <SelectTrigger className="h-7 w-32 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fiscal">Fiscal</SelectItem>
                        <SelectItem value="entrega">Entrega</SelectItem>
                        <SelectItem value="facturacion">Facturación</SelectItem>
                        <SelectItem value="otra">Otra</SelectItem>
                      </SelectContent>
                    </Select>
                    {d.esPrincipal && <Badge variant="secondary" className="text-xs">Principal</Badge>}
                  </div>
                  {i > 0 && <Button variant="ghost" size="icon" className="h-6 w-6"><X className="h-3 w-3" /></Button>}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs">Calle <span className="text-red-500">*</span></Label>
                    <Input placeholder="Av. Corrientes" defaultValue={d.calle} className="h-8" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Número <span className="text-red-500">*</span></Label>
                    <Input placeholder="1234" defaultValue={d.numero} className="h-8" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Piso/Dpto</Label>
                    <Input placeholder="8° B" className="h-8" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">CP</Label>
                    <Input placeholder="C1043" defaultValue={d.codigoPostal} className="h-8" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Ciudad <span className="text-red-500">*</span></Label>
                    <Input placeholder="Buenos Aires" defaultValue={d.ciudad} className="h-8" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Provincia <span className="text-red-500">*</span></Label>
                    <Select defaultValue={d.provincia}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Provincia" /></SelectTrigger>
                      <SelectContent>
                        {['CABA', 'Buenos Aires', 'Córdoba', 'Santa Fe', 'Mendoza', 'Tucumán', 'Jujuy', 'Salta', 'Entre Ríos', 'Río Negro', 'Chubut', 'Neuquén', 'La Pampa', 'San Luis', 'San Juan', 'Catamarca', 'La Rioja', 'Santiago del Estero', 'Chaco', 'Formosa', 'Misiones', 'Corrientes', 'Santa Cruz', 'Tierra del Fuego'].map(p => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">País</Label>
                    <Input placeholder="Argentina" defaultValue="Argentina" className="h-8" />
                  </div>
                  <div className="flex items-center gap-2 col-span-2">
                    <Switch id={`dir-principal-${i}`} defaultChecked={d.esPrincipal} />
                    <Label htmlFor={`dir-principal-${i}`} className="text-xs">Dirección principal</Label>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab 4: Condiciones Comerciales */}
        <TabsContent value="comercial" className="space-y-4 mt-4">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Condiciones de Pago</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Plazo de Pago</Label>
                <Select defaultValue={String(customer?.condicionesPago?.plazo ?? '30')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Contado</SelectItem>
                    <SelectItem value="30">30 días</SelectItem>
                    <SelectItem value="60">60 días</SelectItem>
                    <SelectItem value="90">90 días</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Día de Pago Preferido</Label>
                <Input type="number" placeholder="15" min={1} max={31} defaultValue={customer?.condicionesPago?.diaPagoPreferido} />
              </div>
            </div>
          </div>
          <Separator />
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Límite de Crédito</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Límite ($)</Label>
                <Input type="number" placeholder="500000" defaultValue={customer?.creditoLimite} />
              </div>
              <div className="space-y-1.5 flex items-end">
                <div className="flex items-center gap-2">
                  <Switch id="sin-limite" defaultChecked={customer?.condicionesPago?.sinLimiteCredito} />
                  <Label htmlFor="sin-limite" className="text-sm">Sin límite</Label>
                </div>
              </div>
            </div>
            {customer && (
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Crédito utilizado</span>
                  <span className="font-semibold">${customer.creditoUtilizado.toLocaleString('es-AR')}</span>
                </div>
                <Progress value={creditPct(customer)} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{creditPct(customer)}% utilizado</span>
                  <span>Disponible: ${(customer.creditoLimite - customer.creditoUtilizado).toLocaleString('es-AR')}</span>
                </div>
              </div>
            )}
          </div>
          <Separator />
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Precios y Descuentos</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Lista de Precios Asignada</Label>
                <Select defaultValue={customer?.listaAsignada ?? ''}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar lista" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lista Mayoristas">Lista Mayoristas</SelectItem>
                    <SelectItem value="Lista Minoristas">Lista Minoristas</SelectItem>
                    <SelectItem value="Lista VIP">Lista VIP</SelectItem>
                    <SelectItem value="Lista Distribuidores">Lista Distribuidores</SelectItem>
                    <SelectItem value="Lista Gobierno">Lista Gobierno</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Descuento General (%)</Label>
                <Input type="number" placeholder="0" min={0} max={100} step={0.5} defaultValue={customer?.descuentoGeneral} />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 5: Información Financiera */}
        <TabsContent value="financiero" className="space-y-4 mt-4">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Cuentas Bancarias</h4>
            {(customer?.cuentasBancarias ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Sin cuentas bancarias registradas</p>
            )}
            {(customer?.cuentasBancarias ?? []).map(cb => (
              <div key={cb.id} className="p-3 rounded-lg bg-muted/50 grid grid-cols-3 gap-3 text-sm">
                <div><span className="text-muted-foreground text-xs block">Banco</span><span className="font-medium">{cb.banco}</span></div>
                <div><span className="text-muted-foreground text-xs block">Tipo</span><span className="font-medium capitalize">{cb.tipoCuenta.replace('_', ' ')}</span></div>
                <div><span className="text-muted-foreground text-xs block">CBU/Alias</span><span className="font-mono text-xs">{cb.alias ?? cb.cbu?.slice(0, 12) + '...'}</span></div>
              </div>
            ))}
            <Button variant="outline" size="sm" className="bg-transparent">
              <Plus className="h-3 w-3 mr-1" />
              Agregar cuenta bancaria
            </Button>
          </div>
          <Separator />
          {customer && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Antigüedad de Deuda</h4>
              {customer.balanceCliente && (
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: '0-30 días', value: customer.balanceCliente.antiguedadDeuda.dias0_30, color: 'text-blue-600 bg-blue-50 border-blue-200' },
                    { label: '31-60 días', value: customer.balanceCliente.antiguedadDeuda.dias31_60, color: 'text-amber-600 bg-amber-50 border-amber-200' },
                    { label: '61-90 días', value: customer.balanceCliente.antiguedadDeuda.dias61_90, color: 'text-orange-600 bg-orange-50 border-orange-200' },
                    { label: '+90 días', value: customer.balanceCliente.antiguedadDeuda.dias90_mas, color: 'text-red-600 bg-red-50 border-red-200' },
                  ].map(item => (
                    <div key={item.label} className={`p-3 rounded-lg border text-center ${item.color}`}>
                      <p className="text-xs mb-1">{item.label}</p>
                      <p className="font-bold text-sm">${item.value.toLocaleString('es-AR')}</p>
                    </div>
                  ))}
                </div>
              )}
              {customer.balanceCliente && (
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {[
                    { label: 'Total Comprado', value: customer.balanceCliente.totalComprado, color: 'text-blue-600' },
                    { label: 'Total Pagado', value: customer.balanceCliente.totalPagado, color: 'text-green-600' },
                    { label: 'Total Pendiente', value: customer.balanceCliente.totalPendiente, color: 'text-red-600' },
                  ].map(item => (
                    <div key={item.label} className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                      <p className={`font-bold ${item.color}`}>${item.value.toLocaleString('es-AR')}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Tab 6: Historial */}
        <TabsContent value="historial" className="mt-4">
          {customer ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Movimientos de Cuenta Corriente</h4>
                <div className="rounded-lg border overflow-auto max-h-72">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Fecha</TableHead>
                        <TableHead className="text-xs">Tipo</TableHead>
                        <TableHead className="text-xs">Comprobante</TableHead>
                        <TableHead className="text-xs text-right">Debe</TableHead>
                        <TableHead className="text-xs text-right">Haber</TableHead>
                        <TableHead className="text-xs text-right">Saldo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movimientosCC.filter(m => m.clienteId === customer.id).map(m => (
                        <TableRow key={m.id} className="text-xs">
                          <TableCell>{new Date(m.fecha).toLocaleDateString('es-AR')}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs capitalize">{m.tipo.replace('_', ' ')}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{m.comprobante}</TableCell>
                          <TableCell className="text-right text-red-600 font-medium">{m.debe > 0 ? `$${m.debe.toLocaleString('es-AR')}` : '-'}</TableCell>
                          <TableCell className="text-right text-green-600 font-medium">{m.haber > 0 ? `$${m.haber.toLocaleString('es-AR')}` : '-'}</TableCell>
                          <TableCell className="text-right font-semibold">${Math.abs(m.saldo).toLocaleString('es-AR')}</TableCell>
                        </TableRow>
                      ))}
                      {movimientosCC.filter(m => m.clienteId === customer.id).length === 0 && (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground text-xs py-4">Sin movimientos registrados</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Últimos Pedidos</h4>
                <div className="space-y-2">
                  {salesOrders.filter(o => o.clienteId === customer.id).slice(0, 4).map(o => (
                    <div key={o.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                      <span className="font-mono text-xs">{o.codigo}</span>
                      <span className="text-muted-foreground text-xs">{new Date(o.fecha).toLocaleDateString('es-AR')}</span>
                      <Badge variant="outline" className="text-xs capitalize">{o.estado.replace('_', ' ')}</Badge>
                      <span className="font-semibold text-xs">${o.total.toLocaleString('es-AR')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Guarda el cliente primero para ver el historial
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button variant="outline" onClick={onClose} className="bg-transparent">Cancelar</Button>
        <Button onClick={onClose}>
          <Check className="h-4 w-4 mr-2" />
          {isEditing ? 'Guardar Cambios' : 'Crear Cliente'}
        </Button>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ClientesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [grupoFilter, setGrupoFilter] = useState('todos')
  const [tipoFilter, setTipoFilter] = useState('todos')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)

  const filteredCustomers = useMemo(() => customers.filter(c => {
    const matchesSearch = c.razonSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cuitCuil.includes(searchTerm) ||
      (c.nombreFantasia ?? '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'todos' || c.estado === statusFilter
    const matchesGrupo = grupoFilter === 'todos' || c.grupo === grupoFilter
    const matchesTipo = tipoFilter === 'todos' || c.tipo === tipoFilter
    return matchesSearch && matchesStatus && matchesGrupo && matchesTipo
  }), [searchTerm, statusFilter, grupoFilter, tipoFilter])

  const handleViewDetail = (c: Customer) => { setDetailCustomer(c); setIsDetailOpen(true) }
  const handleEdit = (c: Customer) => { setEditingCustomer(c); setIsFormOpen(true) }

  const grupoColors: Record<string, string> = {
    mayorista: 'bg-blue-100 text-blue-700',
    minorista: 'bg-green-100 text-green-700',
    distribuidor: 'bg-violet-100 text-violet-700',
    vip: 'bg-amber-100 text-amber-700',
    gobierno: 'bg-slate-100 text-slate-700',
  }

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
      <div className="grid gap-4 md:grid-cols-5">
        {[
          { label: 'Total', value: customers.length, color: '' },
          { label: 'Activos', value: customers.filter(c => c.estado === 'activo').length, color: 'text-green-600' },
          { label: 'Morosos', value: customers.filter(c => c.estado === 'moroso').length, color: 'text-orange-600' },
          { label: 'Bloqueados', value: customers.filter(c => c.estado === 'bloqueado').length, color: 'text-red-600' },
          { label: 'Leads', value: customers.filter(c => c.tipo === 'lead').length, color: 'text-violet-600' },
        ].map(stat => (
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
                  placeholder="Buscar por razón social, fantasía o CUIT..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-36">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="inactivo">Inactivo</SelectItem>
                  <SelectItem value="moroso">Moroso</SelectItem>
                  <SelectItem value="bloqueado">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-36">
              <Select value={grupoFilter} onValueChange={setGrupoFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los grupos</SelectItem>
                  <SelectItem value="mayorista">Mayorista</SelectItem>
                  <SelectItem value="minorista">Minorista</SelectItem>
                  <SelectItem value="distribuidor">Distribuidor</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="gobierno">Gobierno</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-36">
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los tipos</SelectItem>
                  <SelectItem value="cliente_final">Cliente Final</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(searchTerm || statusFilter !== 'todos' || grupoFilter !== 'todos' || tipoFilter !== 'todos') && (
              <Button variant="ghost" size="sm" className="bg-transparent" onClick={() => { setSearchTerm(''); setStatusFilter('todos'); setGrupoFilter('todos'); setTipoFilter('todos') }}>
                <X className="h-3 w-3 mr-1" /> Limpiar
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">{filteredCustomers.length} de {customers.length} clientes</p>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Razón Social</TableHead>
                <TableHead>CUIT</TableHead>
                <TableHead>Tipo / Grupo</TableHead>
                <TableHead>Condición IVA</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Crédito</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => {
                const pct = creditPct(customer)
                return (
                  <TableRow
                    key={customer.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => handleViewDetail(customer)}
                  >
                    <TableCell>
                      <div className="font-medium text-sm">{customer.razonSocial}</div>
                      {customer.nombreFantasia && <div className="text-xs text-muted-foreground">{customer.nombreFantasia}</div>}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{customer.cuitCuil}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground capitalize">{customer.tipo.replace('_', ' ')}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium w-fit ${grupoColors[customer.grupo]}`}>
                          {customer.grupo}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs capitalize text-muted-foreground">
                      {customer.condicionImpositiva.replace('_', ' ')}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={estadoBadgeVariant(customer.estado)} className="text-xs w-fit">
                          {customer.estado}
                        </Badge>
                        {customer.diasMora && (
                          <span className="text-xs text-red-600">{customer.diasMora}d mora</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-36">
                      {customer.creditoLimite > 0 ? (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className={estadoColor(customer.estado)}>${customer.creditoUtilizado.toLocaleString('es-AR')}</span>
                            <span className="text-muted-foreground">{pct}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${creditBarColor(pct)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            de ${customer.creditoLimite.toLocaleString('es-AR')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sin crédito</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleViewDetail(customer)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(customer)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 flex-wrap">
              <span>{detailCustomer?.razonSocial}</span>
              <Badge variant={estadoBadgeVariant(detailCustomer?.estado ?? 'activo')}>
                {detailCustomer?.estado}
              </Badge>
              {detailCustomer?.grupo && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${grupoColors[detailCustomer.grupo]}`}>
                  {detailCustomer.grupo}
                </span>
              )}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">{detailCustomer?.cuitCuil} · {detailCustomer?.condicionImpositiva?.replace('_', ' ')}</p>
          </DialogHeader>

          {detailCustomer && (
            <Tabs defaultValue="general">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="contacto">Contacto</TabsTrigger>
                <TabsTrigger value="comercial">Comercial</TabsTrigger>
                <TabsTrigger value="financiero">Financiero</TabsTrigger>
                <TabsTrigger value="historial">Historial</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-3 mt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {[
                    { label: 'Nombre Fantasía', value: detailCustomer.nombreFantasia },
                    { label: 'Tipo', value: detailCustomer.tipo.replace('_', ' ') },
                    { label: 'Vendedor Asignado', value: detailCustomer.vendedorAsignado },
                    { label: 'Lista de Precios', value: detailCustomer.listaAsignada },
                    { label: 'Fecha de Alta', value: new Date(detailCustomer.fechaAlta).toLocaleDateString('es-AR') },
                  ].map(item => (
                    <div key={item.label} className="p-3 rounded-lg bg-muted/50">
                      <span className="text-muted-foreground text-xs block mb-1">{item.label}</span>
                      <p className="font-medium capitalize">{item.value ?? '-'}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="contacto" className="space-y-3 mt-4">
                <div className="space-y-3">
                  {[
                    { icon: Mail, label: 'Email', value: detailCustomer.emailPrincipal },
                    { icon: Phone, label: 'Teléfono', value: detailCustomer.telefono },
                    { icon: MapPin, label: 'Dirección Principal', value: detailCustomer.direccionPrincipal ?? detailCustomer.direcciones?.[0] ? `${detailCustomer.direcciones?.[0]?.calle} ${detailCustomer.direcciones?.[0]?.numero}, ${detailCustomer.direcciones?.[0]?.ciudad}` : '-' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="text-xs text-muted-foreground block">{item.label}</span>
                        <p className="font-medium text-sm">{item.value ?? '-'}</p>
                      </div>
                    </div>
                  ))}
                  {detailCustomer.contactos && detailCustomer.contactos.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Contactos</h4>
                      {detailCustomer.contactos.map(c => (
                        <div key={c.id} className="p-3 rounded-lg bg-muted/50 text-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{c.nombreCompleto}</span>
                            {c.esPrincipal && <Badge variant="secondary" className="text-xs">Principal</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">{c.cargo} · {c.email} · {c.celular}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="comercial" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <span className="text-muted-foreground text-xs block mb-1">Lista Asignada</span>
                    <p className="font-medium">{detailCustomer.listaAsignada ?? '-'}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <span className="text-muted-foreground text-xs block mb-1">Descuento General</span>
                    <p className="font-medium">{detailCustomer.descuentoGeneral ?? 0}%</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <span className="text-muted-foreground text-xs block mb-1">Plazo de Pago</span>
                    <p className="font-medium">{detailCustomer.condicionesPago?.plazo ?? 0} días</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <span className="text-muted-foreground text-xs block mb-1">Día de Pago</span>
                    <p className="font-medium">{detailCustomer.condicionesPago?.diaPagoPreferido ? `Día ${detailCustomer.condicionesPago.diaPagoPreferido}` : '-'}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="financiero" className="space-y-4 mt-4">
                {detailCustomer.creditoLimite > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">Límite de Crédito</h4>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Límite Total', value: `$${detailCustomer.creditoLimite.toLocaleString('es-AR')}`, color: 'text-green-600 bg-green-50 border-green-200' },
                        { label: 'Utilizado', value: `$${detailCustomer.creditoUtilizado.toLocaleString('es-AR')}`, color: 'text-orange-600 bg-orange-50 border-orange-200' },
                        { label: 'Disponible', value: `$${(detailCustomer.creditoLimite - detailCustomer.creditoUtilizado).toLocaleString('es-AR')}`, color: 'text-blue-600 bg-blue-50 border-blue-200' },
                      ].map(item => (
                        <div key={item.label} className={`p-3 rounded-lg border ${item.color}`}>
                          <span className="text-xs block mb-1">{item.label}</span>
                          <p className="font-bold">{item.value}</p>
                        </div>
                      ))}
                    </div>
                    <Progress value={creditPct(detailCustomer)} className="h-2" />
                    <p className="text-xs text-muted-foreground text-right">{creditPct(detailCustomer)}% del límite utilizado</p>
                  </div>
                )}
                {detailCustomer.balanceCliente && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">Balance del Cliente</h4>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <span className="text-xs text-muted-foreground block mb-1">Total Comprado</span>
                        <p className="font-bold">${detailCustomer.balanceCliente.totalComprado.toLocaleString('es-AR')}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <span className="text-xs text-muted-foreground block mb-1">Total Pagado</span>
                        <p className="font-bold text-green-600">${detailCustomer.balanceCliente.totalPagado.toLocaleString('es-AR')}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <span className="text-xs text-muted-foreground block mb-1">Pendiente</span>
                        <p className="font-bold text-red-600">${detailCustomer.balanceCliente.totalPendiente.toLocaleString('es-AR')}</p>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="historial" className="mt-4">
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Últimas Transacciones</h4>
                  <div className="rounded-lg border overflow-auto max-h-64">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Fecha</TableHead>
                          <TableHead className="text-xs">Tipo</TableHead>
                          <TableHead className="text-xs">Comprobante</TableHead>
                          <TableHead className="text-xs text-right">Debe</TableHead>
                          <TableHead className="text-xs text-right">Haber</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {movimientosCC.filter(m => m.clienteId === detailCustomer.id).slice(0, 10).map(m => (
                          <TableRow key={m.id} className="text-xs">
                            <TableCell>{new Date(m.fecha).toLocaleDateString('es-AR')}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{m.tipo.replace('_', ' ')}</Badge></TableCell>
                            <TableCell className="font-mono text-xs">{m.comprobante}</TableCell>
                            <TableCell className="text-right text-red-600">{m.debe > 0 ? `$${m.debe.toLocaleString('es-AR')}` : '-'}</TableCell>
                            <TableCell className="text-right text-green-600">{m.haber > 0 ? `$${m.haber.toLocaleString('es-AR')}` : '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setIsDetailOpen(false)} className="bg-transparent">Cerrar</Button>
            <Button onClick={() => { setIsDetailOpen(false); detailCustomer && handleEdit(detailCustomer) }}>
              <Edit className="h-4 w-4 mr-2" />
              Editar Cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? `Editar: ${editingCustomer.razonSocial}` : 'Nuevo Cliente'}</DialogTitle>
          </DialogHeader>
          <CustomerForm customer={editingCustomer} onClose={() => setIsFormOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
