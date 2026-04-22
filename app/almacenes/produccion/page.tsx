"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  AlertCircle,
  ClipboardList,
  PackagePlus,
  Receipt,
  RefreshCcw,
  Search,
  Wrench,
} from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { WmsDetailFieldGrid, WmsTabsList } from "@/components/almacenes/wms-responsive"
import { useDepositos } from "@/lib/hooks/useDepositos"
import { useOrdenesTrabajo } from "@/lib/hooks/useOrdenesTrabajo"
import { useProduccion } from "@/lib/hooks/useProduccion"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"
import type { FinalizarOrdenTrabajoDto } from "@/lib/types/ordenes-trabajo"
import { toast } from "@/hooks/use-toast"

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "-"
}

function formatQty(value?: number | null) {
  return Number(value ?? 0).toLocaleString("es-AR", { maximumFractionDigits: 2 })
}

function getPlanningStatus(origen?: number, destino?: number) {
  if (origen && destino) return "Circuito completo"
  if (origen || destino) return "Circuito parcial"
  return "Sin depósitos definidos"
}

function SummaryCard({
  title,
  value,
  description,
}: {
  title: string
  value: string
  description: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

export default function ProduccionPage() {
  const searchParams = useSearchParams()
  const defaultSucursalId = useDefaultSucursalId() ?? 1
  const initialOrderId = Number.parseInt(searchParams.get("orden") ?? "", 10)
  const [selectedId, setSelectedId] = useState<number | null>(
    Number.isFinite(initialOrderId) ? initialOrderId : null
  )
  const [search, setSearch] = useState("")
  const [estado, setEstado] = useState("")
  const [detail, setDetail] =
    useState<Awaited<ReturnType<ReturnType<typeof useProduccion>["getDetalleOrden"]>>>(null)
  const [detailBusy, setDetailBusy] = useState(false)
  const [finalizeDraft, setFinalizeDraft] = useState<{
    fechaFinReal: string
    cantidadProducida: string
    consumos: Record<number, string>
  }>({
    fechaFinReal: new Date().toISOString().slice(0, 10),
    cantidadProducida: "",
    consumos: {},
  })
  const [ajusteDraft, setAjusteDraft] = useState({ cantidad: "", observacion: "" })
  const [empaqueDraft, setEmpaqueDraft] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    depositoId: "",
    cantidad: "",
    lote: "",
    observacion: "",
  })
  const [actionError, setActionError] = useState<string | null>(null)

  const { ordenes, loading, error, refetch } = useOrdenesTrabajo({
    sucursalId: defaultSucursalId,
    estado: estado || undefined,
  })
  const { depositos } = useDepositos(defaultSucursalId)
  const {
    getDetalleOrden,
    finalizarOrden,
    registrarAjuste,
    crearOrdenEmpaque,
    saving,
    error: productionError,
  } = useProduccion()

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return ordenes.filter((row) => {
      if (!term) return true
      return [String(row.id), String(row.formulaId), row.estado, row.observacion ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(term)
    })
  }, [ordenes, search])

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null

  useEffect(() => {
    if (!selected) return

    let active = true
    const load = async () => {
      setActionError(null)
      setDetailBusy(true)
      const next = await getDetalleOrden(selected.id)
      if (active) {
        setDetail(next)
        setFinalizeDraft({
          fechaFinReal: new Date().toISOString().slice(0, 10),
          cantidadProducida: next?.cantidadProducida ? String(next.cantidadProducida) : "",
          consumos: Object.fromEntries(
            (next?.consumos ?? []).map((consumo) => [
              consumo.itemId,
              String(consumo.cantidadConsumida || consumo.cantidadPlanificada),
            ])
          ),
        })
      }
      setDetailBusy(false)
    }

    void load()
    return () => {
      active = false
    }
  }, [getDetalleOrden, selected])

  const pendientes = filtered.filter((row) => row.estado === "PENDIENTE").length
  const enProceso = filtered.filter((row) => row.estado === "EN_PROCESO").length
  const completadas = filtered.filter((row) => row.estado === "COMPLETADO").length
  const consumoRegistrado =
    detail?.consumos.reduce((sum, row) => sum + row.cantidadConsumida, 0) ?? 0
  const empaqueRegistrado = detail?.empaques.reduce((sum, row) => sum + row.cantidad, 0) ?? 0

  const handleFinalizar = async () => {
    setActionError(null)

    if (!selected || !detail) return

    if (!finalizeDraft.fechaFinReal) {
      setActionError("Informá la fecha real de cierre antes de finalizar la orden.")
      return
    }

    const cantidadProducida = finalizeDraft.cantidadProducida
      ? Number(finalizeDraft.cantidadProducida)
      : undefined

    if (
      finalizeDraft.cantidadProducida &&
      (Number.isNaN(cantidadProducida) || (cantidadProducida ?? 0) <= 0)
    ) {
      setActionError("La cantidad producida debe ser un número mayor a cero.")
      return
    }

    const consumosInvalidos = detail.consumos.some((consumo) => {
      const value = Number(finalizeDraft.consumos[consumo.itemId] ?? consumo.cantidadConsumida ?? 0)
      return Number.isNaN(value) || value < 0
    })

    if (consumosInvalidos) {
      setActionError("Revisá los consumos del cierre: deben ser valores numéricos no negativos.")
      return
    }

    const dto: FinalizarOrdenTrabajoDto = {
      fechaFinReal: finalizeDraft.fechaFinReal,
      cantidadProducida,
      consumos: detail.consumos.map((consumo) => ({
        itemId: consumo.itemId,
        cantidadConsumida: Number(
          finalizeDraft.consumos[consumo.itemId] ?? consumo.cantidadConsumida ?? 0
        ),
        observacion: consumo.observacion ?? undefined,
      })),
    }

    const ok = await finalizarOrden(selected.id, dto)
    if (!ok) return
    toast({
      title: "Orden finalizada",
      description: `La OT #${selected.id} quedó cerrada en producción.`,
    })
    await refetch()
    const next = await getDetalleOrden(selected.id)
    setDetail(next)
  }

  const handleAjuste = async () => {
    setActionError(null)

    if (!selected || !detail?.depositoOrigenId || !detail?.depositoDestinoId) {
      setActionError(
        "La orden seleccionada no expone el circuito completo de depósitos para registrar ajustes."
      )
      return
    }

    const cantidad = Number(ajusteDraft.cantidad)
    if (Number.isNaN(cantidad) || cantidad <= 0) {
      setActionError("Informá una cantidad de ajuste mayor a cero.")
      return
    }

    const ok = await registrarAjuste({
      formulaId: selected.formulaId,
      depositoOrigenId: detail.depositoOrigenId,
      depositoDestinoId: detail.depositoDestinoId,
      cantidad,
      observacion: ajusteDraft.observacion || undefined,
    })
    if (!ok) return
    setAjusteDraft({ cantidad: "", observacion: "" })
    toast({
      title: "Ajuste registrado",
      description: `Se registró el ajuste para la OT #${selected.id}.`,
    })
    await refetch()
    const next = await getDetalleOrden(selected.id)
    setDetail(next)
  }

  const handleEmpaque = async () => {
    setActionError(null)

    if (!selected || !detail) return
    if (!empaqueDraft.fecha) {
      setActionError("Informá la fecha del empaque.")
      return
    }
    if (!empaqueDraft.depositoId) {
      setActionError("Seleccioná el depósito donde se registra el empaque.")
      return
    }

    const cantidad = Number(empaqueDraft.cantidad)
    if (Number.isNaN(cantidad) || cantidad <= 0) {
      setActionError("La cantidad del empaque debe ser mayor a cero.")
      return
    }

    const ok = await crearOrdenEmpaque({
      ordenTrabajoId: selected.id,
      itemId: detail.itemResultadoId ?? detail.formulaId,
      depositoId: Number(empaqueDraft.depositoId),
      fecha: empaqueDraft.fecha,
      cantidad,
      lote: empaqueDraft.lote || undefined,
      observacion: empaqueDraft.observacion || undefined,
    })
    if (!ok) return
    setEmpaqueDraft({
      fecha: new Date().toISOString().slice(0, 10),
      depositoId: "",
      cantidad: "",
      lote: "",
      observacion: "",
    })
    toast({
      title: "Empaque registrado",
      description: `Se agregó una orden de empaque para la OT #${selected.id}.`,
    })
    const next = await getDetalleOrden(selected.id)
    setDetail(next)
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Producción</h1>
          <p className="mt-1 text-muted-foreground">
            Consola operativa real para consumos, cierre, ajustes y empaques sobre órdenes
            productivas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="bg-transparent"
            onClick={() => void refetch()}
            disabled={loading || saving}
          >
            <RefreshCcw className="mr-2 h-4 w-4" /> Actualizar
          </Button>
          <Button asChild variant="outline" className="bg-transparent">
            <Link href="/almacenes/ordenes-trabajo">Órdenes de trabajo</Link>
          </Button>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          El circuito ahora consume detalle y mutaciones reales del backend. Queda visible lo que
          todavía no tenga datos cargados, sin apoyarse en overlay local.
        </AlertDescription>
      </Alert>

      {error || productionError || actionError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{actionError || productionError || error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Órdenes visibles"
          value={String(filtered.length)}
          description="Órdenes productivas dentro del filtro actual."
        />
        <SummaryCard
          title="Pendientes"
          value={String(pendientes)}
          description="Órdenes sin iniciar en el workflow real."
        />
        <SummaryCard
          title="En proceso"
          value={String(enProceso)}
          description="Órdenes activas con circuito productivo abierto."
        />
        <SummaryCard
          title="Completadas"
          value={String(completadas)}
          description="Órdenes ya finalizadas en backend."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Consumo registrado"
          value={formatQty(consumoRegistrado)}
          description="Suma de consumos ya persistidos para la orden destacada."
        />
        <SummaryCard
          title="Empaque registrado"
          value={formatQty(empaqueRegistrado)}
          description="Cantidad total de empaque visible para la orden destacada."
        />
        <SummaryCard
          title="Depósitos visibles"
          value={String(depositos.length)}
          description="Origen, destino y empaque sobre depósitos reales."
        />
        <SummaryCard
          title="Circuito destacado"
          value={
            selected
              ? getPlanningStatus(selected.depositoOrigenId, selected.depositoDestinoId)
              : "-"
          }
          description="Cobertura logística de la orden seleccionada."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros operativos</CardTitle>
          <CardDescription>
            La selección de estado consulta backend y la búsqueda textual refina la lista cargada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_220px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por orden, fórmula, estado u observación..."
              />
            </div>
            <Select
              value={estado || "all"}
              onValueChange={(value) => setEstado(value === "all" ? "" : value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Estado orden" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="EN_PROCESO">En proceso</SelectItem>
                <SelectItem value="COMPLETADO">Completado</SelectItem>
                <SelectItem value="CANCELADO">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4" /> Circuito productivo visible
            </CardTitle>
            <CardDescription>
              {filtered.length} orden(es) tras filtros. Seleccioná una fila para revisar consumos,
              cierre y empaques.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>OT</TableHead>
                  <TableHead>Fórmula</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Fin previsto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      Cargando órdenes de producción...
                    </TableCell>
                  </TableRow>
                ) : null}
                {!loading && filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No hay órdenes que coincidan con los filtros actuales.
                    </TableCell>
                  </TableRow>
                ) : null}
                {!loading
                  ? filtered.map((row) => (
                      <TableRow
                        key={row.id}
                        className={selected?.id === row.id ? "bg-accent/40" : undefined}
                        onClick={() => setSelectedId(row.id)}
                      >
                        <TableCell className="font-medium">#{row.id}</TableCell>
                        <TableCell>Fórmula #{row.formulaId}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{row.estado}</Badge>
                        </TableCell>
                        <TableCell>{formatDate(row.fecha)}</TableCell>
                        <TableCell>{formatDate(row.fechaFinPrevista)}</TableCell>
                      </TableRow>
                    ))
                  : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selected ? `Producción OT #${selected.id}` : "Detalle de producción"}
            </CardTitle>
            <CardDescription>
              {selected
                ? `Estado ${selected.estado}`
                : "Seleccioná una orden para revisar el circuito productivo."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selected ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No hay orden seleccionada para producción.
              </div>
            ) : detailBusy ? (
              <p className="text-sm text-muted-foreground">Cargando detalle de producción...</p>
            ) : detail ? (
              <Tabs defaultValue="circuito" className="w-full">
                <WmsTabsList className="md:grid-cols-5">
                  <TabsTrigger value="circuito">Circuito</TabsTrigger>
                  <TabsTrigger value="consumos">Consumos</TabsTrigger>
                  <TabsTrigger value="cierre">Cierre</TabsTrigger>
                  <TabsTrigger value="empaque">Empaque</TabsTrigger>
                  <TabsTrigger value="ajustes">Ajustes</TabsTrigger>
                </WmsTabsList>

                <TabsContent value="circuito" className="space-y-4 pt-4">
                  <WmsDetailFieldGrid
                    columns="2"
                    fields={[
                      { label: "Fórmula", value: detail.formulaDescripcion },
                      {
                        label: "Item resultado",
                        value:
                          detail.itemResultadoDescripcion ??
                          detail.itemResultadoCodigo ??
                          "Sin item visible",
                      },
                      {
                        label: "Planificación",
                        value: getPlanningStatus(detail.depositoOrigenId, detail.depositoDestinoId),
                      },
                      { label: "Depósito origen", value: detail.depositoOrigenDescripcion },
                      { label: "Depósito destino", value: detail.depositoDestinoDescripcion },
                      { label: "Cantidad ordenada", value: formatQty(detail.cantidad) },
                      {
                        label: "Cantidad producida",
                        value: formatQty(detail.cantidadProducida),
                      },
                    ]}
                  />
                  <div className="rounded-lg border bg-muted/20 p-4 text-sm">
                    <p className="font-medium">Observación</p>
                    <p className="mt-1 text-muted-foreground">
                      {detail.observacion || "Sin observaciones registradas."}
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="consumos" className="space-y-4 pt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Planificado</TableHead>
                        <TableHead>Consumido</TableHead>
                        <TableHead>Depósito</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.consumos.map((consumo) => (
                        <TableRow key={consumo.id}>
                          <TableCell className="font-medium">{consumo.itemDescripcion}</TableCell>
                          <TableCell>{formatQty(consumo.cantidadPlanificada)}</TableCell>
                          <TableCell>{formatQty(consumo.cantidadConsumida)}</TableCell>
                          <TableCell>
                            {depositos.find((deposito) => deposito.id === consumo.depositoId)
                              ?.descripcion ?? `Depósito #${consumo.depositoId}`}
                          </TableCell>
                        </TableRow>
                      ))}
                      {detail.consumos.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                            Todavía no hay consumos registrados para esta orden.
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="cierre" className="space-y-4 pt-4">
                  <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="fecha-fin-real">Fecha fin real</Label>
                        <Input
                          id="fecha-fin-real"
                          type="date"
                          value={finalizeDraft.fechaFinReal}
                          onChange={(event) =>
                            setFinalizeDraft((prev) => ({
                              ...prev,
                              fechaFinReal: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cantidad-producida">Cantidad producida</Label>
                        <Input
                          id="cantidad-producida"
                          type="number"
                          min="0"
                          step="0.01"
                          value={finalizeDraft.cantidadProducida}
                          onChange={(event) =>
                            setFinalizeDraft((prev) => ({
                              ...prev,
                              cantidadProducida: event.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Consumos a confirmar en cierre</p>
                      <div className="grid gap-3">
                        {detail.consumos.map((consumo) => (
                          <div
                            key={consumo.id}
                            className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_140px]"
                          >
                            <Label>{consumo.itemDescripcion}</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={finalizeDraft.consumos[consumo.itemId] ?? ""}
                              onChange={(event) =>
                                setFinalizeDraft((prev) => ({
                                  ...prev,
                                  consumos: {
                                    ...prev.consumos,
                                    [consumo.itemId]: event.target.value,
                                  },
                                }))
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      El cierre persiste consumos y producción final en la misma operación de backend.
                    </p>
                  </div>
                  <Button
                    onClick={() => void handleFinalizar()}
                    disabled={saving || selected.estado !== "EN_PROCESO"}
                  >
                    <Receipt className="mr-2 h-4 w-4" /> Finalizar orden en backend
                  </Button>
                </TabsContent>

                <TabsContent value="empaque" className="space-y-4 pt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead>Lote</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.empaques.map((empaque) => (
                        <TableRow key={empaque.id}>
                          <TableCell>{formatDate(empaque.fecha)}</TableCell>
                          <TableCell>{formatQty(empaque.cantidad)}</TableCell>
                          <TableCell>{empaque.lote || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{empaque.estado}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {detail.empaques.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                            No hay empaques registrados todavía.
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                  <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="emp-fecha">Fecha</Label>
                        <Input
                          id="emp-fecha"
                          type="date"
                          value={empaqueDraft.fecha}
                          onChange={(event) =>
                            setEmpaqueDraft((prev) => ({ ...prev, fecha: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="emp-deposito">Depósito</Label>
                        <Select
                          value={empaqueDraft.depositoId}
                          onValueChange={(value) =>
                            setEmpaqueDraft((prev) => ({ ...prev, depositoId: value }))
                          }
                        >
                          <SelectTrigger id="emp-deposito" className="w-full">
                            <SelectValue placeholder="Seleccionar depósito" />
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
                        <Label htmlFor="emp-cantidad">Cantidad</Label>
                        <Input
                          id="emp-cantidad"
                          type="number"
                          min="0"
                          step="0.01"
                          value={empaqueDraft.cantidad}
                          onChange={(event) =>
                            setEmpaqueDraft((prev) => ({ ...prev, cantidad: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="emp-lote">Lote</Label>
                        <Input
                          id="emp-lote"
                          value={empaqueDraft.lote}
                          onChange={(event) =>
                            setEmpaqueDraft((prev) => ({ ...prev, lote: event.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emp-observacion">Observación</Label>
                      <Textarea
                        id="emp-observacion"
                        rows={3}
                        value={empaqueDraft.observacion}
                        onChange={(event) =>
                          setEmpaqueDraft((prev) => ({ ...prev, observacion: event.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    El empaque se registra sobre el item resultado publicado por la fórmula activa.
                  </p>
                  <Button onClick={() => void handleEmpaque()} disabled={saving}>
                    <PackagePlus className="mr-2 h-4 w-4" /> Registrar orden de empaque
                  </Button>
                </TabsContent>

                <TabsContent value="ajustes" className="space-y-4 pt-4">
                  <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="ajuste-cantidad">Cantidad</Label>
                        <Input
                          id="ajuste-cantidad"
                          type="number"
                          min="0"
                          step="0.01"
                          value={ajusteDraft.cantidad}
                          onChange={(event) =>
                            setAjusteDraft((prev) => ({ ...prev, cantidad: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ajuste-observacion">Observación</Label>
                        <Textarea
                          id="ajuste-observacion"
                          rows={3}
                          value={ajusteDraft.observacion}
                          onChange={(event) =>
                            setAjusteDraft((prev) => ({ ...prev, observacion: event.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      El ajuste se registra entre los depósitos visibles de la orden seleccionada.
                    </p>
                  </div>
                  <Button
                    onClick={() => void handleAjuste()}
                    disabled={saving || !detail.depositoOrigenId || !detail.depositoDestinoId}
                  >
                    <Wrench className="mr-2 h-4 w-4" /> Registrar ajuste de producción
                  </Button>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No se pudo cargar el detalle de producción.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
