"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useMemo, useState } from "react"
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  RefreshCw,
  Search,
  ShieldAlert,
} from "lucide-react"

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
import { useComprobantes } from "@/lib/hooks/useComprobantes"
import { useLegacyLocalCollection } from "@/lib/hooks/useLegacyLocalCollection"
import { useOrdenesCompra } from "@/lib/hooks/useOrdenesCompra"
import { useProveedores } from "@/lib/hooks/useTerceros"
import type { Comprobante } from "@/lib/types/comprobantes"
import type { OrdenCompra } from "@/lib/types/configuracion"

type AllocationStage = "pendiente" | "en_revision" | "lista_para_cierre" | "cerrada"
type AllocationType = "Compras" | "Importación"

type LocalDistributionLine = {
  id: string
  cuenta: string
  centroCosto: string
  porcentaje: number
  importe: number
}

type LocalAllocationRecord = {
  allocationId: number
  stage: AllocationStage
  owner: string
  nextStep: string
  cuenta: string
  centroCosto: string
  accountingNote: string
  distribucion: LocalDistributionLine[]
}

type AllocationRow = {
  id: number
  tipo: AllocationType
  proveedor: string
  comprobante: string
  cuenta: string
  centroCosto: string
  estado: string
  fecha: string
  importe: number
  saldo: number
  ordenCompraReferencia: string | null
  recepcionReferencia: string | null
  responsable: string
  moneda: string
  circuitoOrigen: string
  observacion: string
  detallesClave: string[]
  tracker: LocalAllocationRecord
}

const ALLOCATION_TRACKER_STORAGE_KEY = "zuluia_compras_allocation_trackers"

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  BORRADOR: { label: "Borrador", variant: "secondary" },
  EMITIDO: { label: "Registrada", variant: "default" },
  PAGADO: { label: "Pagada", variant: "default" },
  PAGADO_PARCIAL: { label: "Pago parcial", variant: "outline" },
  ANULADO: { label: "Anulada", variant: "destructive" },
}

const STAGE_CONFIG: Record<
  AllocationStage,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  pendiente: { label: "Pendiente", variant: "outline" },
  en_revision: { label: "En revisión", variant: "secondary" },
  lista_para_cierre: { label: "Lista para cierre", variant: "default" },
  cerrada: { label: "Cerrada", variant: "default" },
}

function formatMoney(value: number, currency = "ARS") {
  return value.toLocaleString("es-AR", { style: "currency", currency })
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "-"
}

function inferAllocationType(document: Comprobante) {
  const haystack =
    `${document.tipoComprobanteDescripcion ?? ""} ${document.observacion ?? ""}`.toLowerCase()
  return haystack.includes("import") || haystack.includes("despacho") ? "Importación" : "Compras"
}

function inferAccount(type: AllocationType, document: Comprobante) {
  if (type === "Importación") return "Importaciones y nacionalización"
  const description = (document.tipoComprobanteDescripcion ?? "").toLowerCase()
  if (description.includes("serv")) return "Servicios y gastos de compras"
  return "Compras y abastecimiento"
}

function inferCostCenter(relatedOrder: OrdenCompra | null) {
  return relatedOrder ? `Orden OC-${relatedOrder.id}` : "Compras generales"
}

function buildSourceDetails(
  document: Comprobante,
  relatedOrder: OrdenCompra | null,
  providerName: string
) {
  const details = [
    `Documento real ${document.nroComprobante ?? `#${document.id}`} visible en backend.`,
    `Proveedor vinculado: ${providerName}.`,
  ]

  if (relatedOrder) {
    details.push(`Orden relacionada: OC-${relatedOrder.id}.`)
    if (relatedOrder.fechaUltimaRecepcion) {
      details.push(`Última recepción visible: ${formatDate(relatedOrder.fechaUltimaRecepcion)}.`)
    }
  } else {
    details.push("Sin orden de compra vinculada visible en la consulta actual.")
  }

  if ((document.saldo ?? 0) > 0) {
    details.push(`Saldo pendiente visible: ${formatMoney(document.saldo ?? 0)}.`)
  }

  if (document.observacion) {
    details.push(document.observacion)
  }

  return details
}

function buildDefaultRecord(
  document: Comprobante,
  relatedOrder: OrdenCompra | null,
  providerName: string,
  type: AllocationType
): LocalAllocationRecord {
  const cuenta = inferAccount(type, document)
  const centroCosto = inferCostCenter(relatedOrder)
  const importe = document.total ?? 0
  const stage: AllocationStage =
    document.estado === "PAGADO"
      ? "cerrada"
      : document.estado === "PAGADO_PARCIAL"
        ? "lista_para_cierre"
        : document.estado === "BORRADOR"
          ? "pendiente"
          : "en_revision"

  return {
    allocationId: document.id,
    stage,
    owner: "Contabilidad compras",
    nextStep:
      stage === "cerrada"
        ? "Mantener conciliación cerrada y trazabilidad documental."
        : stage === "lista_para_cierre"
          ? "Completar prorrateo final y cerrar el gasto pendiente."
          : stage === "en_revision"
            ? "Validar cuenta, centro de costo y soporte documental."
            : "Preparar cuenta y centro de costo antes de imputar.",
    cuenta,
    centroCosto,
    accountingNote: `Base real sobre ${document.nroComprobante ?? `#${document.id}`} · ${providerName}`,
    distribucion: [
      {
        id: `dist-${document.id}-1`,
        cuenta,
        centroCosto,
        porcentaje: 100,
        importe,
      },
    ],
  }
}

function matchesTerm(item: AllocationRow, term: string) {
  if (term === "") return true
  return [
    item.proveedor,
    item.comprobante,
    item.cuenta,
    item.centroCosto,
    item.circuitoOrigen,
    item.ordenCompraReferencia ?? "",
    item.recepcionReferencia ?? "",
    item.observacion,
    ...item.detallesClave,
  ]
    .join(" ")
    .toLowerCase()
    .includes(term)
}

function getAllocationHealth(item: AllocationRow) {
  if (item.tracker.stage === "cerrada") return "Imputación cerrada y conciliada"
  if (item.tracker.stage === "lista_para_cierre") return "Lista para cierre contable"
  if (item.estado === "PAGADO_PARCIAL") return "Tiene saldo o cierre económico parcial"
  if (item.tracker.stage === "en_revision") return "Requiere validación de cuenta y centro de costo"
  return "Pendiente de distribución o validación"
}

function DetailFieldGrid({ fields }: { fields: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {fields.map((field) => (
        <div key={field.label} className="rounded-lg bg-muted/40 p-3">
          <span className="mb-1 block text-xs text-muted-foreground">{field.label}</span>
          <p className="text-sm font-medium">{field.value}</p>
        </div>
      ))}
    </div>
  )
}

export default function ImputacionesCompraPage() {
  const searchParams = useSearchParams()
  const {
    comprobantes,
    loading: loadingDocs,
    error: docsError,
  } = useComprobantes({ esCompra: true })
  const { ordenes, loading: loadingOrders, error: ordersError } = useOrdenesCompra()
  const {
    terceros: proveedores,
    loading: loadingProviders,
    error: providersError,
  } = useProveedores()
  const {
    rows: records,
    setRows: setRecords,
    reset: resetRecords,
  } = useLegacyLocalCollection<LocalAllocationRecord>(ALLOCATION_TRACKER_STORAGE_KEY, [])

  const routeComprobanteId = Number(searchParams.get("comprobanteId") ?? "")
  const routeProviderId = Number(searchParams.get("proveedorId") ?? "")
  const focusAllocationId =
    Number.isFinite(routeComprobanteId) && routeComprobanteId > 0 ? routeComprobanteId : null
  const focusProviderId =
    Number.isFinite(routeProviderId) && routeProviderId > 0 ? routeProviderId : null

  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<"todas" | AllocationType>("todas")
  const [stageFilter, setStageFilter] = useState<"todas" | AllocationStage>("todas")
  const [selectedId, setSelectedId] = useState<number | null>(focusAllocationId)
  const isLoadingOverview = loadingDocs || loadingOrders || loadingProviders

  const orderByComprobanteId = useMemo(
    () => new Map(ordenes.map((order) => [order.comprobanteId, order])),
    [ordenes]
  )
  const providerNameById = useMemo(
    () =>
      new Map(
        proveedores.map((provider) => [provider.id, provider.razonSocial ?? `#${provider.id}`])
      ),
    [proveedores]
  )
  const recordMap = useMemo(
    () => new Map(records.map((record) => [record.allocationId, record])),
    [records]
  )

  const allocations = useMemo<AllocationRow[]>(() => {
    return comprobantes
      .filter((document) => document.estado !== "ANULADO")
      .map((document) => {
        const relatedOrder = orderByComprobanteId.get(document.id) ?? null
        const providerName = providerNameById.get(document.terceroId) ?? `#${document.terceroId}`
        const type = inferAllocationType(document)
        const tracker =
          recordMap.get(document.id) ??
          buildDefaultRecord(document, relatedOrder, providerName, type)

        return {
          id: document.id,
          tipo: type,
          proveedor: providerName,
          comprobante: document.nroComprobante ?? `#${document.id}`,
          cuenta: tracker.cuenta,
          centroCosto: tracker.centroCosto,
          estado: document.estado,
          fecha: document.fecha,
          importe: document.total ?? 0,
          saldo: document.saldo ?? 0,
          ordenCompraReferencia: relatedOrder ? `OC-${relatedOrder.id}` : null,
          recepcionReferencia: relatedOrder?.fechaUltimaRecepcion
            ? formatDate(relatedOrder.fechaUltimaRecepcion)
            : null,
          responsable: tracker.owner,
          moneda: "ARS",
          circuitoOrigen: relatedOrder
            ? "Comprobante con orden vinculada"
            : "Comprobante directo de compras",
          observacion: tracker.accountingNote,
          detallesClave: buildSourceDetails(document, relatedOrder, providerName),
          tracker,
        }
      })
      .sort((left, right) => right.importe - left.importe)
  }, [comprobantes, orderByComprobanteId, providerNameById, recordMap])

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim()
    return allocations.filter((item) => {
      const matchesSearch = matchesTerm(item, term)
      const matchesType = typeFilter === "todas" || item.tipo === typeFilter
      const matchesStage = stageFilter === "todas" || item.tracker.stage === stageFilter
      return matchesSearch && matchesType && matchesStage
    })
  }, [allocations, search, stageFilter, typeFilter])

  const routeFocusedAllocation = useMemo(
    () =>
      focusAllocationId
        ? (allocations.find((item) => item.id === focusAllocationId) ?? null)
        : null,
    [allocations, focusAllocationId]
  )
  const selected =
    selectedId !== null ? (allocations.find((item) => item.id === selectedId) ?? null) : null

  const kpis = useMemo(() => {
    const observed = allocations.filter((item) => item.tracker.stage === "en_revision").length
    const imported = allocations.filter((item) => item.tipo === "Importación").length
    const closed = allocations.filter((item) => item.tracker.stage === "cerrada").length
    const total = allocations.reduce((acc, item) => acc + item.importe, 0)
    return { observed, imported, closed, total }
  }, [allocations])

  const queue = useMemo(() => {
    const order: Record<AllocationStage, number> = {
      en_revision: 0,
      pendiente: 1,
      lista_para_cierre: 2,
      cerrada: 3,
    }
    return [...filtered]
      .sort(
        (left, right) =>
          order[left.tracker.stage] - order[right.tracker.stage] || right.importe - left.importe
      )
      .slice(0, 5)
  }, [filtered])

  const updateRecord = (allocationId: number, patch: Partial<LocalAllocationRecord>) => {
    const base = allocations.find((item) => item.id === allocationId)?.tracker
    if (!base) return

    setRecords((current) => {
      const index = current.findIndex((row) => row.allocationId === allocationId)
      const nextRow = { ...base, ...patch, allocationId }
      if (index >= 0) {
        return current.map((row, rowIndex) => (rowIndex === index ? nextRow : row))
      }
      return [...current, nextRow]
    })
  }

  const updateAccountingFields = (
    allocationId: number,
    fields: { cuenta?: string; centroCosto?: string }
  ) => {
    const base = allocations.find((item) => item.id === allocationId)?.tracker
    if (!base) return

    const nextCuenta = fields.cuenta ?? base.cuenta
    const nextCentroCosto = fields.centroCosto ?? base.centroCosto
    const importe = allocations.find((item) => item.id === allocationId)?.importe ?? 0
    updateRecord(allocationId, {
      cuenta: nextCuenta,
      centroCosto: nextCentroCosto,
      distribucion: [
        {
          id: base.distribucion[0]?.id ?? `dist-${allocationId}-1`,
          cuenta: nextCuenta,
          centroCosto: nextCentroCosto,
          porcentaje: 100,
          importe,
        },
      ],
    })
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Imputaciones de compras</h1>
          <p className="text-muted-foreground">
            Consola contable híbrida: documentos reales de compras con conciliación local hasta que
            exista endpoint formal.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="bg-transparent" asChild>
            <Link href="/compras/facturas">Ver facturas</Link>
          </Button>
          <Button asChild>
            <Link href="/compras/reportes">
              <ArrowRight className="mr-2 h-4 w-4" /> Ir a reportes
            </Link>
          </Button>
        </div>
      </div>

      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          El backend sigue sin exponer imputaciones contables de compras. Esta vista ya no parte de
          un lote fijo legacy: usa comprobantes reales de compra y suma una capa local para
          distribución y cierre.
        </AlertDescription>
      </Alert>

      {(docsError || ordersError || providersError) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{docsError || ordersError || providersError}</AlertDescription>
        </Alert>
      )}

      {routeFocusedAllocation && (
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            Llegaste con foco sobre la imputación del comprobante{" "}
            {routeFocusedAllocation.comprobante}
            {focusProviderId
              ? ` del proveedor ${routeFocusedAllocation.proveedor || `#${focusProviderId}`}`
              : ""}
            . La fila quedó priorizada para revisión.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">En revisión</p>
            <p className="mt-2 text-2xl font-bold text-amber-600">
              {isLoadingOverview ? "..." : kpis.observed}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Importación</p>
            <p className="mt-2 text-2xl font-bold">{isLoadingOverview ? "..." : kpis.imported}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Cerradas</p>
            <p className="mt-2 text-2xl font-bold text-emerald-600">
              {isLoadingOverview ? "..." : kpis.closed}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Importe visible</p>
            <p className="mt-2 text-2xl font-bold">
              {isLoadingOverview ? "..." : formatMoney(kpis.total)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Continuidad operativa</CardTitle>
            <CardDescription>
              Las imputaciones enlazan comprobante, orden y recepción visible. La capa contable
              sigue siendo local hasta que exista persistencia específica.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" className="bg-transparent" onClick={() => resetRecords()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Restablecer tablero local
            </Button>
            <Button asChild>
              <Link href="/compras/notas-credito">
                <CheckCircle2 className="mr-2 h-4 w-4" /> Ver notas
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Cobertura real</CardTitle>
            <CardDescription>
              Documentos visibles hoy para sostener la conciliación.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-bold">{loadingDocs ? "..." : allocations.length}</p>
            <p className="text-sm text-muted-foreground">
              {isLoadingOverview
                ? "Cargando documentos, órdenes y proveedores visibles..."
                : `comprobantes base y ${ordenes.length} órdenes visibles / ${proveedores.length} proveedores visibles`}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 lg:grid-cols-[1.7fr_repeat(2,minmax(0,1fr))]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar proveedor, cuenta, comprobante, orden o centro de costo..."
              />
            </div>
            <Select
              value={typeFilter}
              onValueChange={(value) => setTypeFilter(value as "todas" | AllocationType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todos los tipos</SelectItem>
                <SelectItem value="Compras">Compras</SelectItem>
                <SelectItem value="Importación">Importación</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={stageFilter}
              onValueChange={(value) => setStageFilter(value as "todas" | AllocationStage)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seguimiento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todo el seguimiento</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="en_revision">En revisión</SelectItem>
                <SelectItem value="lista_para_cierre">Lista para cierre</SelectItem>
                <SelectItem value="cerrada">Cerrada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.8fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lote de imputaciones</CardTitle>
            <CardDescription>
              Base documental real con cuenta y centro de costo mantenidos localmente.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Seguimiento</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow
                    key={item.id}
                    className={
                      focusAllocationId === item.id ? "bg-primary/5 hover:bg-primary/10" : undefined
                    }
                  >
                    <TableCell className="font-medium">IMP-{item.id}</TableCell>
                    <TableCell>{item.tipo}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p>{item.proveedor}</p>
                        <p className="text-xs text-muted-foreground">{item.comprobante}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p>{item.cuenta}</p>
                        <p className="text-xs text-muted-foreground">{item.centroCosto}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_CONFIG[item.estado]?.variant ?? "outline"}>
                        {STATUS_CONFIG[item.estado]?.label ?? item.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STAGE_CONFIG[item.tracker.stage].variant}>
                        {STAGE_CONFIG[item.tracker.stage].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedId(item.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      {loadingDocs
                        ? "Cargando comprobantes reales..."
                        : "No hay imputaciones que coincidan con los filtros actuales."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cola operativa</CardTitle>
            <CardDescription>
              Se priorizan revisión manual, importes altos y cierre pendiente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {queue.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className="w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">IMP-{item.id}</p>
                    <p className="text-sm text-muted-foreground">{item.proveedor}</p>
                  </div>
                  <Badge variant={STAGE_CONFIG[item.tracker.stage].variant}>
                    {STAGE_CONFIG[item.tracker.stage].label}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{getAllocationHealth(item)}</p>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{selected ? `Imputación IMP-${selected.id}` : "Imputación"}</DialogTitle>
            <DialogDescription>
              {selected
                ? `${selected.proveedor} · ${selected.comprobante} · ${selected.centroCosto}`
                : "Detalle de imputación"}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <Tabs defaultValue="circuito">
              <TabsList className="grid h-auto w-full grid-cols-4">
                <TabsTrigger value="circuito">Circuito</TabsTrigger>
                <TabsTrigger value="distribucion">Distribución</TabsTrigger>
                <TabsTrigger value="observaciones">Observaciones</TabsTrigger>
                <TabsTrigger value="seguimiento">Seguimiento</TabsTrigger>
              </TabsList>

              <TabsContent value="circuito" className="space-y-4 pt-2">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Cabecera contable</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <DetailFieldGrid
                        fields={[
                          { label: "Proveedor", value: selected.proveedor },
                          { label: "Comprobante", value: selected.comprobante },
                          { label: "Tipo", value: selected.tipo },
                          { label: "Cuenta principal", value: selected.cuenta },
                          { label: "Centro de costo", value: selected.centroCosto },
                          {
                            label: "Orden asociada",
                            value: selected.ordenCompraReferencia ?? "Sin orden visible",
                          },
                          {
                            label: "Recepción visible",
                            value: selected.recepcionReferencia ?? "Sin recepción visible",
                          },
                          { label: "Salud del circuito", value: getAllocationHealth(selected) },
                        ]}
                      />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Importe y origen</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <DetailFieldGrid
                        fields={[
                          {
                            label: "Importe",
                            value: formatMoney(selected.importe, selected.moneda),
                          },
                          {
                            label: "Saldo visible",
                            value: formatMoney(selected.saldo, selected.moneda),
                          },
                          { label: "Moneda", value: selected.moneda },
                          {
                            label: "Responsable",
                            value: selected.tracker.owner || selected.responsable,
                          },
                          { label: "Circuito origen", value: selected.circuitoOrigen },
                          { label: "Fecha", value: formatDate(selected.fecha) },
                          {
                            label: "Estado documental",
                            value: STATUS_CONFIG[selected.estado]?.label ?? selected.estado,
                          },
                          {
                            label: "Seguimiento local",
                            value: STAGE_CONFIG[selected.tracker.stage].label,
                          },
                        ]}
                      />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="distribucion" className="space-y-4 pt-2">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Asignación principal</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Cuenta</label>
                        <Input
                          value={selected.tracker.cuenta}
                          onChange={(event) =>
                            updateAccountingFields(selected.id, { cuenta: event.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Centro de costo</label>
                        <Input
                          value={selected.tracker.centroCosto}
                          onChange={(event) =>
                            updateAccountingFields(selected.id, { centroCosto: event.target.value })
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Prorrateo visible</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Cuenta</TableHead>
                            <TableHead>Centro costo</TableHead>
                            <TableHead>Porcentaje</TableHead>
                            <TableHead>Importe</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selected.tracker.distribucion.map((row) => (
                            <TableRow key={row.id}>
                              <TableCell className="font-medium">{row.cuenta}</TableCell>
                              <TableCell>{row.centroCosto}</TableCell>
                              <TableCell>{row.porcentaje}%</TableCell>
                              <TableCell>{formatMoney(row.importe, selected.moneda)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="observaciones" className="pt-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Observaciones del circuito</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nota contable local</label>
                      <Textarea
                        rows={5}
                        value={selected.tracker.accountingNote}
                        onChange={(event) =>
                          updateRecord(selected.id, { accountingNote: event.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      {selected.detallesClave.map((detail) => (
                        <div
                          key={detail}
                          className="rounded-lg bg-muted/40 p-3 text-muted-foreground"
                        >
                          {detail}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="seguimiento" className="space-y-4 pt-2">
                <Alert>
                  <ShieldAlert className="h-4 w-4" />
                  <AlertDescription>
                    Este seguimiento se guarda solo en el navegador actual y cubre el trabajo de
                    conciliación hasta que exista backend formal de imputaciones.
                  </AlertDescription>
                </Alert>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Seguimiento local</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Estado operativo</label>
                        <Select
                          value={selected.tracker.stage}
                          onValueChange={(value) =>
                            updateRecord(selected.id, { stage: value as AllocationStage })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccionar estado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendiente">Pendiente</SelectItem>
                            <SelectItem value="en_revision">En revisión</SelectItem>
                            <SelectItem value="lista_para_cierre">Lista para cierre</SelectItem>
                            <SelectItem value="cerrada">Cerrada</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Responsable</label>
                        <Input
                          value={selected.tracker.owner}
                          onChange={(event) =>
                            updateRecord(selected.id, { owner: event.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Próximo paso</label>
                        <Textarea
                          rows={5}
                          value={selected.tracker.nextStep}
                          onChange={(event) =>
                            updateRecord(selected.id, { nextStep: event.target.value })
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Continuidad del circuito</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">Estado actual</p>
                        <p className="mt-1 font-medium">{getAllocationHealth(selected)}</p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">Saldo documental</p>
                        <p className="mt-1 font-medium">
                          {formatMoney(selected.saldo, selected.moneda)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground">Paso sugerido</p>
                        <p className="mt-1 font-medium">{selected.tracker.nextStep}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
