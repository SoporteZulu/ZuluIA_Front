'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Plus, Search, MoreHorizontal, AlertCircle, RefreshCw, ChevronLeft, ChevronRight,
} from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useItems, useItemsConfig } from '@/lib/hooks/useItems'
import { apiGet } from '@/lib/api'
import type { Item, CreateItemDto, StockItem } from '@/lib/types/items'

// ─── Item Form ────────────────────────────────────────────────────────────────

const EMPTY_FORM: CreateItemDto = {
  codigo: '',
  codigoBarras: null,
  descripcion: '',
  descripcionAdicional: null,
  categoriaId: null,
  unidadMedidaId: 0,
  alicuotaIvaId: 0,
  monedaId: 0,
  esProducto: true,
  esServicio: false,
  esFinanciero: false,
  manejaStock: true,
  precioCosto: 0,
  precioVenta: 0,
  stockMinimo: 0,
  stockMaximo: null,
  codigoAfip: null,
}

interface ItemFormProps {
  item: Item | null
  onClose: () => void
  onSaved: () => void
  createItem: (dto: CreateItemDto) => Promise<boolean>
  updateItem: (id: number, dto: Partial<CreateItemDto>) => Promise<boolean>
}

function ItemForm({ item, onClose, onSaved, createItem, updateItem }: ItemFormProps) {
  const { categorias, unidades, alicuotas, monedas } = useItemsConfig()
  const [form, setForm] = useState<CreateItemDto>(
    item
      ? {
          codigo: item.codigo,
          codigoBarras: item.codigoBarras,
          descripcion: item.descripcion,
          descripcionAdicional: item.descripcionAdicional,
          categoriaId: item.categoriaId,
          unidadMedidaId: item.unidadMedidaId,
          alicuotaIvaId: item.alicuotaIvaId,
          monedaId: item.monedaId,
          esProducto: item.esProducto,
          esServicio: item.esServicio,
          esFinanciero: item.esFinanciero,
          manejaStock: item.manejaStock,
          precioCosto: item.precioCosto,
          precioVenta: item.precioVenta,
          stockMinimo: item.stockMinimo,
          stockMaximo: item.stockMaximo,
          codigoAfip: item.codigoAfip,
        }
      : { ...EMPTY_FORM }
  )
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const set = (k: keyof CreateItemDto, v: unknown) =>
    setForm((prev) => ({ ...prev, [k]: v }))

  const handleTipo = (tipo: 'esProducto' | 'esServicio' | 'esFinanciero') => {
    setForm((prev) => ({
      ...prev,
      esProducto: tipo === 'esProducto',
      esServicio: tipo === 'esServicio',
      esFinanciero: tipo === 'esFinanciero',
    }))
  }

  const validate = (): string | null => {
    if (!form.codigo.trim()) return 'El código es requerido'
    if (!form.descripcion.trim()) return 'La descripción es requerida'
    if (!form.unidadMedidaId) return 'Seleccione una unidad de medida'
    if (!form.alicuotaIvaId) return 'Seleccione una alícuota de IVA'
    if (!form.monedaId) return 'Seleccione una moneda'
    if (form.precioVenta < 0) return 'El precio de venta no puede ser negativo'
    return null
  }

  const handleSave = async () => {
    const err = validate()
    if (err) { setFormError(err); return }
    setSaving(true)
    setFormError(null)
    const ok = item
      ? await updateItem(item.id, form)
      : await createItem(form)
    setSaving(false)
    if (ok) onSaved()
    else setFormError('No se pudo guardar el producto')
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Código <span className="text-red-500">*</span></Label>
          <Input value={form.codigo} onChange={(e) => set('codigo', e.target.value)} placeholder="PROD-001" />
        </div>
        <div className="space-y-1.5">
          <Label>Código de Barras</Label>
          <Input value={form.codigoBarras ?? ''} onChange={(e) => set('codigoBarras', e.target.value || null)} placeholder="7890000000000" />
        </div>
        <div className="space-y-1.5 col-span-2">
          <Label>Descripción <span className="text-red-500">*</span></Label>
          <Input value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} placeholder="Nombre del producto" />
        </div>
        <div className="space-y-1.5 col-span-2">
          <Label>Descripción Adicional</Label>
          <Textarea value={form.descripcionAdicional ?? ''} onChange={(e) => set('descripcionAdicional', e.target.value || null)} placeholder="Descripción adicional..." className="resize-none h-16" />
        </div>
        <div className="space-y-1.5">
          <Label>Categoría</Label>
          <Select
            value={form.categoriaId ? String(form.categoriaId) : '__none__'}
            onValueChange={(v) => set('categoriaId', v !== '__none__' ? Number(v) : null)}
          >
            <SelectTrigger><SelectValue placeholder="Sin categoría" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Sin categoría</SelectItem>
              {categorias.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.descripcion}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Unidad de Medida <span className="text-red-500">*</span></Label>
          <Select
            value={form.unidadMedidaId ? String(form.unidadMedidaId) : ''}
            onValueChange={(v) => set('unidadMedidaId', Number(v))}
          >
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>
              {unidades.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.descripcion}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Alícuota IVA <span className="text-red-500">*</span></Label>
          <Select
            value={form.alicuotaIvaId ? String(form.alicuotaIvaId) : ''}
            onValueChange={(v) => set('alicuotaIvaId', Number(v))}
          >
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>
              {alicuotas.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.descripcion} ({a.porcentaje}%)</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Moneda <span className="text-red-500">*</span></Label>
          <Select
            value={form.monedaId ? String(form.monedaId) : ''}
            onValueChange={(v) => set('monedaId', Number(v))}
          >
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>
              {monedas.map((m) => <SelectItem key={m.id} value={String(m.id)}>{m.descripcion} ({m.simbolo})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Precio Costo <span className="text-red-500">*</span></Label>
          <Input type="number" min={0} step="0.01" value={form.precioCosto} onChange={(e) => set('precioCosto', parseFloat(e.target.value) || 0)} />
        </div>
        <div className="space-y-1.5">
          <Label>Precio Venta <span className="text-red-500">*</span></Label>
          <Input type="number" min={0} step="0.01" value={form.precioVenta} onChange={(e) => set('precioVenta', parseFloat(e.target.value) || 0)} />
        </div>
        <div className="space-y-1.5">
          <Label>Stock Mínimo</Label>
          <Input type="number" min={0} value={form.stockMinimo} onChange={(e) => set('stockMinimo', parseInt(e.target.value) || 0)} />
        </div>
        <div className="space-y-1.5">
          <Label>Stock Máximo</Label>
          <Input type="number" min={0} value={form.stockMaximo ?? ''} onChange={(e) => set('stockMaximo', e.target.value ? parseInt(e.target.value) : null)} placeholder="Sin límite" />
        </div>
        <div className="space-y-1.5">
          <Label>Código AFIP</Label>
          <Input value={form.codigoAfip ?? ''} onChange={(e) => set('codigoAfip', e.target.value || null)} placeholder="Opcional" />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 pt-2">
        <div className="flex items-center gap-2">
          <Switch checked={form.esProducto} onCheckedChange={() => handleTipo('esProducto')} id="esProducto" />
          <Label htmlFor="esProducto">Es Producto</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={form.esServicio} onCheckedChange={() => handleTipo('esServicio')} id="esServicio" />
          <Label htmlFor="esServicio">Es Servicio</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={form.esFinanciero} onCheckedChange={() => handleTipo('esFinanciero')} id="esFinanciero" />
          <Label htmlFor="esFinanciero">Es Financiero</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={form.manejaStock} onCheckedChange={(v) => set('manejaStock', v)} id="manejaStock" />
          <Label htmlFor="manejaStock">Maneja Stock</Label>
        </div>
      </div>

      {formError && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="h-4 w-4" /> {formError}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button variant="outline" onClick={onClose} className="bg-transparent">Cancelar</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando...' : item ? 'Guardar Cambios' : 'Crear Producto'}
        </Button>
      </div>
    </div>
  )
}

// ─── Detail Dialog ────────────────────────────────────────────────────────────

function ItemDetail({ item, onClose, onEdit }: { item: Item; onClose: () => void; onEdit: () => void }) {
  const [stock, setStock] = useState<StockItem[]>([])
  const [loadingStock, setLoadingStock] = useState(true)

  useEffect(() => {
    setLoadingStock(true)
    apiGet<StockItem[] | { depositos: StockItem[] }>(`/api/stock/item/${item.id}`)
      .then((res) => {
        if (Array.isArray(res)) setStock(res)
        else setStock(res.depositos ?? [])
      })
      .catch(() => setStock([]))
      .finally(() => setLoadingStock(false))
  }, [item.id])

  const fields = [
    { label: 'Código', value: item.codigo },
    { label: 'Código de Barras', value: item.codigoBarras ?? '-' },
    { label: 'Descripción', value: item.descripcion },
    { label: 'Descripción Adicional', value: item.descripcionAdicional ?? '-' },
    { label: 'Categoría', value: item.categoriaDescripcion ?? String(item.categoriaId ?? '-') },
    { label: 'Unidad de Medida', value: item.unidadMedidaDescripcion ?? String(item.unidadMedidaId) },
    { label: 'Alícuota IVA', value: item.alicuotaIvaPorcentaje !== undefined ? `${item.alicuotaIvaPorcentaje}%` : String(item.alicuotaIvaId) },
    { label: 'Moneda', value: item.monedaSimbol ?? String(item.monedaId) },
    { label: 'Precio Costo', value: `$${item.precioCosto.toFixed(2)}` },
    { label: 'Precio Venta', value: `$${item.precioVenta.toFixed(2)}` },
    { label: 'Stock Mínimo', value: String(item.stockMinimo) },
    { label: 'Stock Máximo', value: item.stockMaximo !== null ? String(item.stockMaximo) : 'Sin límite' },
    { label: 'Código AFIP', value: item.codigoAfip ?? '-' },
    { label: 'Tipo', value: [item.esProducto && 'Producto', item.esServicio && 'Servicio', item.esFinanciero && 'Financiero'].filter(Boolean).join(', ') || '-' },
    { label: 'Maneja Stock', value: item.manejaStock ? 'Sí' : 'No' },
    { label: 'Estado', value: item.activo ? 'Activo' : 'Inactivo' },
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

      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Stock por Depósito</h4>
        {loadingStock ? (
          <p className="text-sm text-muted-foreground">Cargando stock...</p>
        ) : stock.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin datos de stock</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Depósito</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stock.map((s) => (
                <TableRow key={s.depositoId}>
                  <TableCell>{s.depositoDescripcion}</TableCell>
                  <TableCell className="text-right font-medium">{s.cantidad}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <DialogFooter className="gap-2 mt-2">
        <Button variant="outline" onClick={onClose} className="bg-transparent">Cerrar</Button>
        <Button onClick={onEdit}>Editar</Button>
      </DialogFooter>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ProductosPage() {
  const {
    items, loading, error, totalCount, totalPages, page, setPage,
    search, setSearch, createItem, updateItem, deleteItem, refetch,
  } = useItems()

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
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleViewDetail = (item: Item) => { setSelectedItem(item); setIsDetailOpen(true) }
  const handleEdit = (item: Item) => { setEditingItem(item); setIsFormOpen(true) }
  const handleDeleteConfirm = (item: Item) => { setSelectedItem(item); setIsDeleteOpen(true) }

  const handleDelete = async () => {
    if (!selectedItem) return
    setDeleting(true)
    await deleteItem(selectedItem.id)
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Productos</h1>
          <p className="text-muted-foreground">Gestiona el catálogo de productos del inventario.</p>
        </div>
        <Button onClick={() => { setEditingItem(null); setIsFormOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Producto
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar productos..."
                className="pl-8"
                value={debouncedSearch}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          </div>
          {!loading && !error && (
            <p className="text-xs text-muted-foreground">{totalCount} productos encontrados</p>
          )}
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Cargando productos...</span>
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
                    <TableHead>Código</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">P. Costo</TableHead>
                    <TableHead className="text-right">P. Venta</TableHead>
                    <TableHead className="text-right">Stock Mín.</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        No se encontraron productos
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.id} className="cursor-pointer hover:bg-muted/40" onClick={() => handleViewDetail(item)}>
                        <TableCell className="font-mono text-sm">{item.codigo}</TableCell>
                        <TableCell className="font-medium">{item.descripcion}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.categoriaDescripcion ?? (item.categoriaId ? `Cat. ${item.categoriaId}` : '-')}
                        </TableCell>
                        <TableCell className="text-right">${item.precioCosto.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">${item.precioVenta.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{item.stockMinimo}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {item.esProducto ? 'Producto' : item.esServicio ? 'Servicio' : 'Financiero'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.activo
                            ? <Badge variant="secondary" className="bg-green-500/10 text-green-600 text-xs">Activo</Badge>
                            : <Badge variant="secondary" className="bg-gray-500/10 text-gray-500 text-xs">Inactivo</Badge>}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetail(item)}>Ver detalles</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(item)}>Editar</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteConfirm(item)}>
                                Desactivar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? `Editar: ${editingItem.descripcion}` : 'Nuevo Producto'}</DialogTitle>
          </DialogHeader>
          <ItemForm
            item={editingItem}
            onClose={() => setIsFormOpen(false)}
            onSaved={handleSaved}
            createItem={createItem}
            updateItem={updateItem}
          />
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedItem?.descripcion}</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <ItemDetail
              item={selectedItem}
              onClose={() => setIsDetailOpen(false)}
              onEdit={() => { setIsDetailOpen(false); handleEdit(selectedItem) }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Desactivar este producto?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            El producto <strong>{selectedItem?.descripcion}</strong> será desactivado y no aparecerá en las listas activas.
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
