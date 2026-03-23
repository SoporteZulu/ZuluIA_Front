"use client"

import { useMemo, useState } from "react"
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Filter,
  Loader2,
  RefreshCw,
  Save,
  Search,
  SlidersHorizontal,
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
import { Textarea } from "@/components/ui/textarea"
import { useDepositos } from "@/lib/hooks/useDepositos"
import { useItems } from "@/lib/hooks/useItems"
import { useStockActions, useStockMovimientos } from "@/lib/hooks/useStock"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"

type AjusteFormState = {
  itemId: string
  depositoId: string
  nuevaCantidad: string
  observacion: string
}

type TransferFormState = {
  itemId: string
  depositoOrigenId: string
  depositoDestinoId: string
  cantidad: string
  observacion: string
}

const emptyAjuste = (): AjusteFormState => ({
  itemId: "",
  depositoId: "",
  nuevaCantidad: "",
  observacion: "",
})

const emptyTransfer = (): TransferFormState => ({
  itemId: "",
  depositoOrigenId: "",
  depositoDestinoId: "",
  cantidad: "",
  observacion: "",
})

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date)
}

function getMovementScope(tipoMovimiento: string) {
  const normalized = tipoMovimiento.toLowerCase()

  if (normalized.includes("transfer")) return "Interdeposito"
  if (normalized.includes("ajuste")) return "Regularizacion"
  if (normalized.includes("compra") || normalized.includes("entrada")) return "Ingreso"
  if (normalized.includes("venta") || normalized.includes("salida")) return "Egreso"
  return "Movimiento manual"
}

function getMovementStatus(cantidad: number, saldoResultante: number) {
  if (saldoResultante < 0) return "Saldo inconsistente"
  if (cantidad > 0) return "Impacto positivo"
  if (cantidad < 0) return "Impacto negativo"
  return "Sin impacto"
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

function getTypeBadge(type: string) {
  const normalized = type.toLowerCase()

  if (
    normalized.includes("entrada") ||
    normalized === "compra" ||
    normalized.includes("ajuste_positivo")
  ) {
    return (
      <Badge variant="secondary" className="bg-green-500/10 text-green-600">
        <ArrowDownLeft className="mr-1 h-3 w-3" />
        Entrada
      </Badge>
    )
  }

  if (
    normalized.includes("salida") ||
    normalized === "venta" ||
    normalized.includes("ajuste_negativo")
  ) {
    return (
      <Badge variant="secondary" className="bg-red-500/10 text-red-600">
        <ArrowUpRight className="mr-1 h-3 w-3" />
        Salida
      </Badge>
    )
  }

  if (normalized.includes("transfer")) {
    return (
      <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
        <ArrowLeftRight className="mr-1 h-3 w-3" />
        Transferencia
      </Badge>
    )
  }

  return (
    <Badge variant="outline">
      <Filter className="mr-1 h-3 w-3" />
      {type}
    </Badge>
  )
}

export default function MovimientosPage() {
  const sucursalId = useDefaultSucursalId()
  const { items } = useItems()
  const { depositos } = useDepositos(sucursalId)
  const [selectedItemId, setSelectedItemId] = useState("todos")
  const [selectedDepositoId, setSelectedDepositoId] = useState("todos")
  const [search, setSearch] = useState("")
  const [isAjusteOpen, setIsAjusteOpen] = useState(false)
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [ajusteForm, setAjusteForm] = useState<AjusteFormState>(emptyAjuste)
  const [transferForm, setTransferForm] = useState<TransferFormState>(emptyTransfer)

  const {
    movimientos,
    loading,
    error,
    totalCount,
    totalPages,
    page,
    setPage,
    desde,
    setDesde,
    hasta,
    setHasta,
    refetch,
  } = useStockMovimientos(
    selectedItemId === "todos" ? undefined : Number(selectedItemId),
    selectedDepositoId === "todos" ? undefined : Number(selectedDepositoId)
  )
  const { ajustar, transferir, loading: actionLoading, error: actionHookError } = useStockActions()

  const itemLabelMap = useMemo(
    () => new Map(items.map((item) => [item.id, `${item.codigo} - ${item.descripcion}`])),
    [items]
  )
  const depositoLabelMap = useMemo(
    () => new Map(depositos.map((deposito) => [deposito.id, deposito.descripcion])),
    [depositos]
  )

  const filteredMovimientos = useMemo(() => {
    const term = search.trim().toLowerCase()
    return movimientos.filter((movimiento) => {
      if (!term) return true

      const itemLabel = itemLabelMap.get(movimiento.itemId)?.toLowerCase() ?? ""
      const depositoLabel = depositoLabelMap.get(movimiento.depositoId)?.toLowerCase() ?? ""

      return (
        movimiento.tipoMovimiento.toLowerCase().includes(term) ||
        String(movimiento.itemId).includes(term) ||
        itemLabel.includes(term) ||
        depositoLabel.includes(term) ||
        (movimiento.observacion ?? "").toLowerCase().includes(term)
      )
    })
  }, [depositoLabelMap, itemLabelMap, movimientos, search])

  const entradas = filteredMovimientos.filter((movimiento) => movimiento.cantidad > 0).length
  const salidas = filteredMovimientos.filter((movimiento) => movimiento.cantidad < 0).length
  const transferencias = filteredMovimientos.filter((movimiento) =>
    movimiento.tipoMovimiento.toLowerCase().includes("transfer")
  ).length
  const netoMovimiento = filteredMovimientos.reduce(
    (total, movimiento) => total + movimiento.cantidad,
    0
  )
  const conObservacion = filteredMovimientos.filter((movimiento) => movimiento.observacion).length
  const itemsImpactados = new Set(filteredMovimientos.map((movimiento) => movimiento.itemId)).size
  const depositosImpactados = new Set(
    filteredMovimientos.map((movimiento) => movimiento.depositoId)
  ).size

  const selectedItem =
    selectedItemId === "todos"
      ? null
      : (items.find((item) => item.id === Number(selectedItemId)) ?? null)
  const selectedDeposito =
    selectedDepositoId === "todos"
      ? null
      : (depositos.find((deposito) => deposito.id === Number(selectedDepositoId)) ?? null)

  const refreshAll = async () => {
    await refetch()
  }

  const handleAjuste = async () => {
    const itemId = Number.parseInt(ajusteForm.itemId, 10)
    const depositoId = Number.parseInt(ajusteForm.depositoId, 10)
    const nuevaCantidad = Number.parseFloat(ajusteForm.nuevaCantidad)

    if (Number.isNaN(itemId) || Number.isNaN(depositoId) || Number.isNaN(nuevaCantidad)) {
      setActionError("Completa ítem, depósito y cantidad válida para registrar el ajuste.")
      return
    }

    setActionError(null)
    const ok = await ajustar({
      itemId,
      depositoId,
      nuevaCantidad,
      observacion: ajusteForm.observacion || undefined,
    })

    if (!ok) {
      setActionError("No se pudo registrar el ajuste de stock.")
      return
    }

    await refreshAll()
    setIsAjusteOpen(false)
    setAjusteForm(emptyAjuste())
  }

  const handleTransfer = async () => {
    const itemId = Number.parseInt(transferForm.itemId, 10)
    const depositoOrigenId = Number.parseInt(transferForm.depositoOrigenId, 10)
    const depositoDestinoId = Number.parseInt(transferForm.depositoDestinoId, 10)
    const cantidad = Number.parseFloat(transferForm.cantidad)

    if (
      Number.isNaN(itemId) ||
      Number.isNaN(depositoOrigenId) ||
      Number.isNaN(depositoDestinoId) ||
      Number.isNaN(cantidad) ||
      cantidad <= 0
    ) {
      setActionError("Completa ítem, depósitos y cantidad válida para registrar la transferencia.")
      return
    }

    if (depositoOrigenId === depositoDestinoId) {
      setActionError("El depósito origen debe ser diferente del depósito destino.")
      return
    }

    setActionError(null)
    const ok = await transferir({
      itemId,
      depositoOrigenId,
      depositoDestinoId,
      cantidad,
      observacion: transferForm.observacion || undefined,
    })

    if (!ok) {
      setActionError("No se pudo registrar la transferencia.")
      return
    }

    await refreshAll()
    setIsTransferOpen(false)
    setTransferForm(emptyTransfer())
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Movimientos de stock</h1>
          <p className="text-muted-foreground mt-1">
            Libro operativo de entradas, salidas y transferencias registradas. Las altas disponibles
            hoy se limitan a ajuste y transferencia.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void refreshAll()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button variant="outline" onClick={() => setIsAjusteOpen(true)}>
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Registrar ajuste
          </Button>
          <Button onClick={() => setIsTransferOpen(true)}>
            <ArrowLeftRight className="h-4 w-4 mr-2" />
            Registrar transferencia
          </Button>
        </div>
      </div>

      {(error || actionHookError || actionError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Movimientos de stock</AlertTitle>
          <AlertDescription>{actionError ?? actionHookError ?? error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Movimientos visibles"
          value={filteredMovimientos.length}
          description={`Página ${page} de ${totalPages || 1} sobre ${totalCount} registros backend`}
          icon={<Filter className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Entradas"
          value={entradas}
          description="Con cantidad positiva en la vista actual"
          icon={<ArrowDownLeft className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Salidas"
          value={salidas}
          description="Con cantidad negativa en la vista actual"
          icon={<ArrowUpRight className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Transferencias"
          value={transferencias}
          description="Identificadas por tipo de movimiento"
          icon={<ArrowLeftRight className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Balance neto"
          value={netoMovimiento >= 0 ? `+${netoMovimiento}` : netoMovimiento}
          description="Resultado acumulado del lote actualmente filtrado"
          icon={<Filter className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Con observacion"
          value={conObservacion}
          description="Movimientos con referencia operativa visible"
          icon={<Search className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Items impactados"
          value={itemsImpactados}
          description="Productos distintos involucrados en la vista actual"
          icon={<Filter className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Depositos impactados"
          value={depositosImpactados}
          description="Almacenes alcanzados por los movimientos filtrados"
          icon={<ArrowLeftRight className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros de consulta</CardTitle>
          <CardDescription>
            Ítem, depósito y fechas consultan backend; la búsqueda textual afina el lote cargado.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_240px_240px_180px_180px]">
          <div className="space-y-2">
            <Label>Buscar movimiento</Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Tipo, observación, ítem o depósito"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ítem</Label>
            <Select
              value={selectedItemId}
              onValueChange={(value) => {
                setSelectedItemId(value)
                setPage(1)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los ítems" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los ítems</SelectItem>
                {items.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {item.codigo} - {item.descripcion}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Depósito</Label>
            <Select
              value={selectedDepositoId}
              onValueChange={(value) => {
                setSelectedDepositoId(value)
                setPage(1)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los depósitos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los depósitos</SelectItem>
                {depositos.map((deposito) => (
                  <SelectItem key={deposito.id} value={String(deposito.id)}>
                    {deposito.descripcion}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Desde</Label>
            <Input
              type="date"
              value={desde}
              onChange={(event) => {
                setDesde(event.target.value)
                setPage(1)
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Hasta</Label>
            <Input
              type="date"
              value={hasta}
              onChange={(event) => {
                setHasta(event.target.value)
                setPage(1)
              }}
            />
          </div>

          {(selectedItem || selectedDeposito) && (
            <div className="xl:col-span-5 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Contexto operativo: </span>
              {selectedItem
                ? `${selectedItem.codigo} - ${selectedItem.descripcion}`
                : "Todos los items"}
              {" · "}
              {selectedDeposito ? selectedDeposito.descripcion : "Todos los depositos"}
              {desde || hasta ? ` · Ventana ${desde || "inicio"} a ${hasta || "hoy"}` : ""}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Libro de movimientos</CardTitle>
          <CardDescription>
            Historial operativo del stock para la combinación de filtros actual.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Ítem</TableHead>
                <TableHead>Depósito</TableHead>
                <TableHead>Circuito</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Observación</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    <div className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando movimientos...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredMovimientos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    No hay movimientos registrados para los filtros actuales.
                  </TableCell>
                </TableRow>
              ) : (
                filteredMovimientos.map((movimiento) => (
                  <TableRow key={movimiento.id}>
                    <TableCell className="text-muted-foreground">
                      <div className="space-y-1">
                        <p>{formatDateTime(movimiento.fecha)}</p>
                        <p className="text-xs">#{movimiento.id}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getTypeBadge(movimiento.tipoMovimiento)}</TableCell>
                    <TableCell className="font-medium">
                      <div className="space-y-1">
                        <p>{itemLabelMap.get(movimiento.itemId) ?? `Ítem #${movimiento.itemId}`}</p>
                        <p className="text-xs text-muted-foreground">ID {movimiento.itemId}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {depositoLabelMap.get(movimiento.depositoId) ??
                        `Depósito #${movimiento.depositoId}`}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant="outline" className="text-xs">
                          {getMovementScope(movimiento.tipoMovimiento)}
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {getMovementStatus(movimiento.cantidad, movimiento.saldoResultante)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono ${movimiento.cantidad >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {movimiento.cantidad >= 0 ? `+${movimiento.cantidad}` : movimiento.cantidad}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {movimiento.saldoResultante}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {movimiento.observacion ?? "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Anterior
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Lectura operativa</CardTitle>
            <CardDescription>
              El libro actual ya expone fecha, tipo, item, deposito, saldo y observaciones.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Las entradas y salidas se leen en la misma grilla con impacto cuantitativo inmediato.
            </p>
            <p>
              Las transferencias quedan visibles como movimientos del circuito entre depositos, sin
              inventar relaciones que backend aun no expone.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ajustes visibles</CardTitle>
            <CardDescription>
              La operacion actual permite fijar cantidad resultante por item y deposito.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Usa observacion para dejar motivo, conteo o referencia del recuento fisico.</p>
            <p>
              La vista conserva el enfoque frontend: mejor lectura del circuito, sin sumar reglas de
              negocio nuevas.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transferencias</CardTitle>
            <CardDescription>
              Origen, destino y cantidad ya quedan soportados por el flujo actual.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              La recomendacion operativa es registrar en observacion remito interno, picking o
              referencia logistica cuando exista.
            </p>
            <p>
              Con esto el usuario recupera mas trazabilidad visible, similar a lo que esperaba del
              legado de stock.
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isAjusteOpen} onOpenChange={setIsAjusteOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar ajuste</DialogTitle>
            <DialogDescription>
              Ajusta la cantidad resultante de un ítem en un depósito concreto usando el endpoint
              soportado por backend.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Ítem</Label>
              <Select
                value={ajusteForm.itemId}
                onValueChange={(value) =>
                  setAjusteForm((current) => ({ ...current, itemId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un ítem" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.codigo} - {item.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Depósito</Label>
              <Select
                value={ajusteForm.depositoId}
                onValueChange={(value) =>
                  setAjusteForm((current) => ({ ...current, depositoId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un depósito" />
                </SelectTrigger>
                <SelectContent>
                  {depositos.map((deposito) => (
                    <SelectItem key={deposito.id} value={String(deposito.id)}>
                      {deposito.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nueva cantidad</Label>
              <Input
                min="0"
                type="number"
                value={ajusteForm.nuevaCantidad}
                onChange={(event) =>
                  setAjusteForm((current) => ({ ...current, nuevaCantidad: event.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                El valor ingresado reemplaza el saldo visible del item en el deposito seleccionado.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Observación</Label>
              <Textarea
                rows={3}
                value={ajusteForm.observacion}
                onChange={(event) =>
                  setAjusteForm((current) => ({ ...current, observacion: event.target.value }))
                }
                placeholder="Motivo del ajuste"
              />
              <p className="text-xs text-muted-foreground">
                Ejemplos: inventario fisico, merma, regularizacion o correccion administrativa.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAjusteOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={actionLoading} onClick={() => void handleAjuste()}>
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar ajuste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar transferencia</DialogTitle>
            <DialogDescription>
              Mueve stock entre depósitos usando la operación actualmente expuesta por backend.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Ítem</Label>
              <Select
                value={transferForm.itemId}
                onValueChange={(value) =>
                  setTransferForm((current) => ({ ...current, itemId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un ítem" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.codigo} - {item.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Origen</Label>
                <Select
                  value={transferForm.depositoOrigenId}
                  onValueChange={(value) =>
                    setTransferForm((current) => ({ ...current, depositoOrigenId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Depósito origen" />
                  </SelectTrigger>
                  <SelectContent>
                    {depositos.map((deposito) => (
                      <SelectItem key={deposito.id} value={String(deposito.id)}>
                        {deposito.descripcion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Destino</Label>
                <Select
                  value={transferForm.depositoDestinoId}
                  onValueChange={(value) =>
                    setTransferForm((current) => ({ ...current, depositoDestinoId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Depósito destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {depositos.map((deposito) => (
                      <SelectItem key={deposito.id} value={String(deposito.id)}>
                        {deposito.descripcion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cantidad</Label>
              <Input
                min="0"
                type="number"
                value={transferForm.cantidad}
                onChange={(event) =>
                  setTransferForm((current) => ({ ...current, cantidad: event.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                La transferencia mueve unidades del deposito origen al destino dentro del mismo
                circuito operativo.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Observación</Label>
              <Textarea
                rows={3}
                value={transferForm.observacion}
                onChange={(event) =>
                  setTransferForm((current) => ({ ...current, observacion: event.target.value }))
                }
                placeholder="Referencia operativa"
              />
              <p className="text-xs text-muted-foreground">
                Conviene indicar referencia interna, traslado, picking o motivo logistico.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTransferOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={actionLoading} onClick={() => void handleTransfer()}>
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Registrar transferencia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
