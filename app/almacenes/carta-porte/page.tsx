"use client"

import { useCallback, useMemo, useState } from "react"
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileCheck,
  History,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  Ticket,
  Truck,
  XCircle,
} from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
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
import { Switch } from "@/components/ui/switch"
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
import {
  WmsDetailFieldGrid,
  WmsDialogContent,
  WmsTabsList,
} from "@/components/almacenes/wms-responsive"
import { toast } from "@/hooks/use-toast"
import { useCartaPorte } from "@/lib/hooks/useCartaPorte"
import { useTransportistas } from "@/lib/hooks/useTransportistas"
import type { CartaPorte, CartaPorteEvento, OrdenCarga } from "@/lib/types/carta-porte"

function today() {
  return new Date().toISOString().slice(0, 10)
}

function digitsOnly(value: string) {
  return value.replace(/\D+/g, "")
}

function formatDate(value?: string) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short" }).format(date)
}

function formatDateTime(value?: string) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(date)
}

function estadoVariant(estado?: string) {
  switch ((estado ?? "").toUpperCase()) {
    case "PENDIENTE":
      return "secondary" as const
    case "ORDEN_CARGA_ASIGNADA":
      return "outline" as const
    case "CTG_SOLICITADO":
      return "outline" as const
    case "CTG_ERROR":
      return "destructive" as const
    case "ACTIVA":
      return "default" as const
    case "CONFIRMADA":
      return "default" as const
    case "ANULADA":
      return "destructive" as const
    default:
      return "outline" as const
  }
}

function estadoLabel(estado?: string) {
  switch ((estado ?? "").toUpperCase()) {
    case "PENDIENTE":
      return "Pendiente"
    case "ORDEN_CARGA_ASIGNADA":
      return "Orden de carga asignada"
    case "CTG_SOLICITADO":
      return "CTG solicitado"
    case "CTG_ERROR":
      return "CTG con error"
    case "ACTIVA":
      return "Activa"
    case "CONFIRMADA":
      return "Confirmada"
    case "ANULADA":
      return "Anulada"
    default:
      return estado ?? "-"
  }
}

function getDocumentStatus(carta?: CartaPorte | null, ordenCarga?: OrdenCarga | null) {
  if (!carta) return "-"
  if (carta.estado === "ANULADA") return "Fuera de circuito"
  if (carta.estado === "CONFIRMADA") return "Circuito cerrado"
  if (carta.estado === "ACTIVA") return "Lista para confirmar"
  if (carta.estado === "CTG_ERROR") return "Requiere seguimiento AFIP"
  if (carta.estado === "CTG_SOLICITADO") return "Esperando respuesta AFIP"
  if (ordenCarga) return "Con carga planificada"
  return "Documento base cargado"
}

function getRouteStatus(ordenCarga?: OrdenCarga | null) {
  if (!ordenCarga) return "Sin orden de carga"
  if (ordenCarga.origen && ordenCarga.destino) return "Origen y destino definidos"
  if (ordenCarga.origen || ordenCarga.destino) return "Ruta parcial"
  return "Ruta pendiente"
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

export default function CartaPortePage() {
  const [estado, setEstado] = useState("")
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")
  const [soloConErrorCtg, setSoloConErrorCtg] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<CartaPorte | null>(null)
  const [ordenCarga, setOrdenCarga] = useState<OrdenCarga | null>(null)
  const [historial, setHistorial] = useState<CartaPorteEvento[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [orderOpen, setOrderOpen] = useState(false)
  const [solicitarOpen, setSolicitarOpen] = useState(false)
  const [consultarOpen, setConsultarOpen] = useState(false)
  const [anularOpen, setAnularOpen] = useState(false)
  const [createDraft, setCreateDraft] = useState({
    comprobanteId: "",
    cuitRemitente: "",
    cuitDestinatario: "",
    transportistaId: "none",
    cuitTransportista: "",
    fechaEmision: today(),
    observacion: "",
  })
  const [ctgDraft, setCtgDraft] = useState({ nroCtg: "" })
  const [orderDraft, setOrderDraft] = useState({
    transportistaId: "none",
    fechaCarga: today(),
    origen: "",
    destino: "",
    patente: "",
    observacion: "",
  })
  const [solicitarDraft, setSolicitarDraft] = useState({ fechaSolicitud: today(), observacion: "" })
  const [consultarDraft, setConsultarDraft] = useState({
    fechaConsulta: today(),
    nroCtg: "",
    error: "",
    observacion: "",
  })
  const [anularDraft, setAnularDraft] = useState({ fecha: today(), observacion: "" })

  const {
    cartas,
    loading,
    error,
    page,
    setPage,
    totalPages,
    totalCount,
    getById,
    getOrdenCarga,
    getHistorial,
    crear,
    asignarCtg,
    crearOrdenCarga,
    solicitarCtg,
    reintentarCtg,
    consultarCtg,
    confirmar,
    anular,
    refetch,
  } = useCartaPorte({
    estado: estado || undefined,
    soloConErrorCtg,
    desde: desde || undefined,
    hasta: hasta || undefined,
  })
  const { transportistas } = useTransportistas(false)

  const transportistaById = useMemo(
    () => new Map(transportistas.map((transportista) => [transportista.id, transportista])),
    [transportistas]
  )

  const getTransportistaCuit = useCallback(
    (transportistaId?: number) => {
      if (!transportistaId) return ""
      const transportista = transportistaById.get(transportistaId)
      return transportista?.nroCuitTransportista ?? transportista?.terceroCuit ?? ""
    },
    [transportistaById]
  )

  const transportistaName = useCallback(
    (transportistaId?: number) => {
      if (!transportistaId) return "Sin transportista"
      return (
        transportistaById.get(transportistaId)?.terceroRazonSocial ??
        `Transportista #${transportistaId}`
      )
    },
    [transportistaById]
  )

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return cartas.filter((carta) => {
      if (!term) return true
      return (
        String(carta.id).includes(term) ||
        String(carta.comprobanteId ?? "").includes(term) ||
        (carta.nroCtg ?? "").toLowerCase().includes(term) ||
        (carta.cuitRemitente ?? "").toLowerCase().includes(term) ||
        (carta.cuitDestinatario ?? "").toLowerCase().includes(term) ||
        (carta.ultimoErrorCtg ?? "").toLowerCase().includes(term) ||
        estadoLabel(carta.estado).toLowerCase().includes(term) ||
        transportistaName(carta.transportistaId).toLowerCase().includes(term)
      )
    })
  }, [cartas, searchTerm, transportistaName])

  const selected = useMemo(
    () => filtered.find((carta) => carta.id === selectedId) ?? null,
    [filtered, selectedId]
  )

  const loadSelectedData = useCallback(
    async (id: number) => {
      setDetailLoading(true)
      const [nextDetail, nextOrdenCarga, nextHistorial] = await Promise.all([
        getById(id),
        getOrdenCarga(id),
        getHistorial(id),
      ])
      setDetail(nextDetail)
      setOrdenCarga(nextOrdenCarga)
      setHistorial(nextHistorial)
      setDetailLoading(false)
    },
    [getById, getHistorial, getOrdenCarga]
  )

  const handleSelectCarta = async (id: number) => {
    setSelectedId(id)
    await loadSelectedData(id)
  }

  const handleRefresh = async () => {
    setActionError(null)
    await refetch()
    if (selectedId) {
      await loadSelectedData(selectedId)
    }
  }

  const runAction = async (
    key: string,
    action: () => Promise<boolean>,
    successTitle: string,
    successDescription: string
  ) => {
    setActionError(null)
    setBusyAction(key)
    const ok = await action()
    if (!ok) {
      setActionError("La operación no pudo completarse con el backend actual.")
      setBusyAction(null)
      return
    }

    await refetch()
    if (selectedId) {
      await loadSelectedData(selectedId)
    }
    toast({ title: successTitle, description: successDescription })
    setBusyAction(null)
  }

  const handleCreate = async () => {
    setActionError(null)
    const cuitRemitente = digitsOnly(createDraft.cuitRemitente)
    const cuitDestinatario = digitsOnly(createDraft.cuitDestinatario)
    const cuitTransportista = digitsOnly(createDraft.cuitTransportista)

    if (cuitRemitente.length !== 11 || cuitDestinatario.length !== 11) {
      setActionError("Remitente y destinatario deben informarse con CUIT de 11 dígitos.")
      return
    }
    if (cuitTransportista && cuitTransportista.length !== 11) {
      setActionError("El CUIT del transportista debe tener 11 dígitos si se informa.")
      return
    }
    if (!createDraft.fechaEmision) {
      setActionError("Informá la fecha de emisión de la carta de porte.")
      return
    }

    setBusyAction("crear")
    const createdId = await crear({
      comprobanteId: createDraft.comprobanteId ? Number(createDraft.comprobanteId) : undefined,
      cuitRemitente,
      cuitDestinatario,
      cuitTransportista: cuitTransportista || undefined,
      fechaEmision: createDraft.fechaEmision,
      observacion: createDraft.observacion || undefined,
    })
    if (!createdId) {
      setActionError("No se pudo registrar la carta de porte.")
      setBusyAction(null)
      return
    }

    setCreateOpen(false)
    setCreateDraft({
      comprobanteId: "",
      cuitRemitente: "",
      cuitDestinatario: "",
      transportistaId: "none",
      cuitTransportista: "",
      fechaEmision: today(),
      observacion: "",
    })
    setSelectedId(createdId)
    await loadSelectedData(createdId)
    toast({ title: "Carta creada", description: `La carta #${createdId} quedó registrada.` })
    setBusyAction(null)
  }

  const handleAssignCtg = async () => {
    if (!selectedDetail?.id || !ctgDraft.nroCtg.trim()) {
      setActionError("Seleccioná una carta e informá un CTG válido.")
      return
    }
    await runAction(
      "ctg",
      () => asignarCtg(selectedDetail.id, ctgDraft.nroCtg.trim()),
      "CTG asignado",
      `La carta #${selectedDetail.id} actualizó su número de CTG.`
    )
    setAssignOpen(false)
    setCtgDraft({ nroCtg: "" })
  }

  const handleCrearOrdenCarga = async () => {
    if (!selectedDetail?.id) return
    if (!orderDraft.fechaCarga || !orderDraft.origen.trim() || !orderDraft.destino.trim()) {
      setActionError("Fecha, origen y destino son obligatorios para la orden de carga.")
      return
    }
    await runAction(
      "orden-carga",
      () =>
        crearOrdenCarga(selectedDetail.id, {
          transportistaId:
            orderDraft.transportistaId === "none" ? undefined : Number(orderDraft.transportistaId),
          fechaCarga: orderDraft.fechaCarga,
          origen: orderDraft.origen.trim(),
          destino: orderDraft.destino.trim(),
          patente: orderDraft.patente.trim() || undefined,
          observacion: orderDraft.observacion.trim() || undefined,
        }),
      "Orden de carga creada",
      `La carta #${selectedDetail.id} ya tiene su circuito logístico asociado.`
    )
    setOrderOpen(false)
    setOrderDraft({
      transportistaId: "none",
      fechaCarga: today(),
      origen: "",
      destino: "",
      patente: "",
      observacion: "",
    })
  }

  const handleSolicitarCtg = async (retry = false) => {
    if (!selectedDetail?.id || !solicitarDraft.fechaSolicitud) {
      setActionError("Informá la fecha de solicitud para continuar.")
      return
    }
    await runAction(
      retry ? "reintentar-ctg" : "solicitar-ctg",
      () =>
        retry
          ? reintentarCtg(selectedDetail.id, {
              fechaSolicitud: solicitarDraft.fechaSolicitud,
              observacion: solicitarDraft.observacion.trim() || undefined,
            })
          : solicitarCtg(selectedDetail.id, {
              fechaSolicitud: solicitarDraft.fechaSolicitud,
              observacion: solicitarDraft.observacion.trim() || undefined,
            }),
      retry ? "Reintento de CTG registrado" : "Solicitud de CTG registrada",
      retry
        ? `La carta #${selectedDetail.id} marcó un nuevo intento AFIP.`
        : `La carta #${selectedDetail.id} quedó en gestión AFIP.`
    )
    setSolicitarOpen(false)
  }

  const handleConsultarCtg = async () => {
    if (!selectedDetail?.id || !consultarDraft.fechaConsulta) {
      setActionError("Informá la fecha de consulta para continuar.")
      return
    }
    if (
      !consultarDraft.nroCtg.trim() &&
      !consultarDraft.error.trim() &&
      !consultarDraft.observacion.trim()
    ) {
      setActionError("Debés informar un CTG, un error o una observación de consulta.")
      return
    }
    await runAction(
      "consultar-ctg",
      () =>
        consultarCtg(selectedDetail.id, {
          fechaConsulta: consultarDraft.fechaConsulta,
          nroCtg: consultarDraft.nroCtg.trim() || undefined,
          error: consultarDraft.error.trim() || undefined,
          observacion: consultarDraft.observacion.trim() || undefined,
        }),
      "Consulta de CTG registrada",
      `La carta #${selectedDetail.id} actualizó su estado AFIP.`
    )
    setConsultarOpen(false)
  }

  const handleAnular = async () => {
    if (!selectedDetail?.id) return
    await runAction(
      "anular",
      () =>
        anular(selectedDetail.id, {
          fecha: anularDraft.fecha || undefined,
          observacion: anularDraft.observacion.trim() || undefined,
        }),
      "Carta anulada",
      `La carta #${selectedDetail.id} quedó anulada en el workflow documental.`
    )
    setAnularOpen(false)
  }

  const selectedDetail = detail ?? selected
  const pendingCount = cartas.filter((carta) => carta.estado === "PENDIENTE").length
  const activeCount = cartas.filter((carta) => carta.estado === "ACTIVA").length
  const confirmedCount = cartas.filter((carta) => carta.estado === "CONFIRMADA").length
  const errorCount = cartas.filter(
    (carta) => carta.estado === "CTG_ERROR" || Boolean(carta.ultimoErrorCtg)
  ).length

  const canCreateOrder = Boolean(
    selectedDetail && selectedDetail.estado !== "ANULADA" && !ordenCarga
  )
  const canAssignCtg = Boolean(
    selectedDetail && selectedDetail.estado !== "ANULADA" && !selectedDetail.nroCtg
  )
  const canRequestCtg = Boolean(
    selectedDetail && !["ANULADA", "CONFIRMADA"].includes(selectedDetail.estado)
  )
  const canRetryCtg = Boolean(
    selectedDetail && (selectedDetail.estado === "CTG_ERROR" || selectedDetail.ultimoErrorCtg)
  )
  const canConfirm = Boolean(
    selectedDetail && !["ANULADA", "CONFIRMADA"].includes(selectedDetail.estado)
  )
  const canAnular = Boolean(selectedDetail && selectedDetail.estado !== "ANULADA")

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Carta de porte</h1>
          <p className="text-muted-foreground">
            Consola documental y logística conectada al workflow real: alta válida, orden de carga,
            gestión CTG, confirmación, anulación e historial del circuito.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => void handleRefresh()}
            disabled={loading || detailLoading}
          >
            <RefreshCcw className="h-4 w-4" />
            Actualizar
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Nueva carta
          </Button>
        </div>
      </div>

      {(error || actionError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{actionError || error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Documentos visibles"
          value={String(totalCount)}
          description={`Página ${page} de ${Math.max(totalPages, 1)} con filtros aplicados.`}
        />
        <SummaryCard
          title="Pendientes"
          value={String(pendingCount)}
          description="Cartas base aún sin circuito AFIP completo."
        />
        <SummaryCard
          title="Activas"
          value={String(activeCount)}
          description="Documentos listos para confirmación operativa."
        />
        <SummaryCard
          title="Errores CTG"
          value={String(errorCount)}
          description="Cartas que requieren seguimiento o reintento AFIP."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Confirmadas"
          value={String(confirmedCount)}
          description="Circuitos cerrados correctamente en backend."
        />
        <SummaryCard
          title="Historial visible"
          value={String(historial.length)}
          description="Eventos cargados para la carta actualmente seleccionada."
        />
        <SummaryCard
          title="Estado seleccionado"
          value={selectedDetail ? getDocumentStatus(selectedDetail, ordenCarga) : "-"}
          description="Lectura operativa del documento activo."
        />
        <SummaryCard
          title="Ruta seleccionada"
          value={selectedDetail ? getRouteStatus(ordenCarga) : "-"}
          description="Cobertura actual de origen y destino logístico."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros documentales</CardTitle>
          <CardDescription>
            Estado y fechas consultan backend; la búsqueda textual refina la página descargada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_180px_180px_220px]">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar por ID, comprobante, CTG, CUIT o transportista..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <Input
              type="date"
              value={desde}
              onChange={(event) => {
                setDesde(event.target.value)
                setPage(1)
              }}
            />
            <Input
              type="date"
              value={hasta}
              onChange={(event) => {
                setHasta(event.target.value)
                setPage(1)
              }}
            />
            <Select
              value={estado || "all"}
              onValueChange={(value) => {
                setEstado(value === "all" ? "" : value)
                setPage(1)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="ORDENCARGAASIGNADA">Orden de carga asignada</SelectItem>
                <SelectItem value="CTGSOLICITADO">CTG solicitado</SelectItem>
                <SelectItem value="CTGERROR">CTG error</SelectItem>
                <SelectItem value="ACTIVA">Activa</SelectItem>
                <SelectItem value="CONFIRMADA">Confirmada</SelectItem>
                <SelectItem value="ANULADA">Anulada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Switch checked={soloConErrorCtg} onCheckedChange={setSoloConErrorCtg} />
            <div>
              <p className="text-sm font-medium">Sólo con error de CTG</p>
              <p className="text-xs text-muted-foreground">
                Filtra directamente en backend los documentos con último error AFIP registrado.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Cartas de porte</CardTitle>
            <CardDescription>{filtered.length} documentos en la página actual</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>CTG</TableHead>
                  <TableHead>Transportista</TableHead>
                  <TableHead>Emisión</TableHead>
                  <TableHead>Intentos</TableHead>
                  <TableHead className="text-right">Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Cargando cartas de porte...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No hay cartas de porte para los filtros actuales.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((carta) => (
                    <TableRow
                      key={carta.id}
                      className={selected?.id === carta.id ? "bg-muted/40" : undefined}
                      onClick={() => void handleSelectCarta(carta.id)}
                    >
                      <TableCell className="font-medium">#{carta.id}</TableCell>
                      <TableCell>
                        <Badge variant={estadoVariant(carta.estado)}>
                          {estadoLabel(carta.estado)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{carta.nroCtg ?? "-"}</TableCell>
                      <TableCell>{transportistaName(carta.transportistaId)}</TableCell>
                      <TableCell>{formatDate(carta.fechaEmision)}</TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <p>{carta.intentosCtg}</p>
                          <p className="text-xs text-muted-foreground">
                            {carta.ultimoErrorCtg ? "Con observación" : "Sin error"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => void handleSelectCarta(carta.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Página {page} de {Math.max(totalPages, 1)}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={page >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selected ? `Carta #${selected.id}` : "Detalle documental"}
            </CardTitle>
            <CardDescription>
              {selectedDetail
                ? `${estadoLabel(selectedDetail.estado)} · ${getDocumentStatus(selectedDetail, ordenCarga)}`
                : "Seleccioná una carta para operar el circuito documental y logístico."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selected ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAssignOpen(true)}
                    disabled={!canAssignCtg || busyAction !== null}
                  >
                    <Ticket className="h-4 w-4" />
                    Asignar CTG
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOrderOpen(true)}
                    disabled={!canCreateOrder || busyAction !== null}
                  >
                    <Truck className="h-4 w-4" />
                    Orden de carga
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSolicitarOpen(true)}
                    disabled={!canRequestCtg || busyAction !== null}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Solicitar CTG
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConsultarOpen(true)}
                    disabled={!selectedDetail || busyAction !== null}
                  >
                    <History className="h-4 w-4" />
                    Consultar CTG
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleSolicitarCtg(true)}
                    disabled={!canRetryCtg || busyAction !== null}
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Reintentar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      selectedDetail &&
                      void runAction(
                        "confirmar",
                        () => confirmar(selectedDetail.id),
                        "Carta confirmada",
                        `La carta #${selectedDetail.id} cerró su circuito documental.`
                      )
                    }
                    disabled={!canConfirm || busyAction !== null}
                  >
                    <FileCheck className="h-4 w-4" />
                    Confirmar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setAnularOpen(true)}
                    disabled={!canAnular || busyAction !== null}
                  >
                    <XCircle className="h-4 w-4" />
                    Anular
                  </Button>
                </div>

                {detailLoading ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    Cargando detalle, orden de carga e historial...
                  </div>
                ) : selectedDetail ? (
                  <Tabs defaultValue="general" className="space-y-4">
                    <WmsTabsList className="md:grid-cols-3">
                      <TabsTrigger value="general">General</TabsTrigger>
                      <TabsTrigger value="orden-carga">Orden de carga</TabsTrigger>
                      <TabsTrigger value="historial">Historial</TabsTrigger>
                    </WmsTabsList>

                    <TabsContent value="general" className="space-y-4">
                      <WmsDetailFieldGrid
                        fields={[
                          {
                            label: "Estado",
                            value: (
                              <Badge variant={estadoVariant(selectedDetail.estado)}>
                                {estadoLabel(selectedDetail.estado)}
                              </Badge>
                            ),
                          },
                          {
                            label: "CTG",
                            value: (
                              <span className="font-mono text-base font-semibold">
                                {selectedDetail.nroCtg ?? "Pendiente"}
                              </span>
                            ),
                          },
                          {
                            label: "Comprobante origen",
                            value: selectedDetail.comprobanteId ?? "Sin vincular",
                          },
                          {
                            label: "Orden de carga",
                            value: selectedDetail.ordenCargaId ?? "Sin orden asociada",
                          },
                          {
                            label: "Transportista base",
                            value: transportistaName(selectedDetail.transportistaId),
                          },
                          {
                            label: "Fecha de emisión",
                            value: formatDate(selectedDetail.fechaEmision),
                          },
                          {
                            label: "Fecha solicitud CTG",
                            value: formatDate(selectedDetail.fechaSolicitudCtg),
                          },
                          { label: "CUIT remitente", value: selectedDetail.cuitRemitente },
                          { label: "CUIT destinatario", value: selectedDetail.cuitDestinatario },
                          {
                            label: "CUIT transportista",
                            value: selectedDetail.cuitTransportista ?? "Sin informar",
                          },
                          { label: "Intentos CTG", value: selectedDetail.intentosCtg },
                          {
                            label: "Alta",
                            value: formatDateTime(selectedDetail.createdAt),
                          },
                          {
                            label: "Última actualización",
                            value: formatDateTime(selectedDetail.updatedAt),
                          },
                        ]}
                      />

                      {selectedDetail.ultimoErrorCtg && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{selectedDetail.ultimoErrorCtg}</AlertDescription>
                        </Alert>
                      )}

                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">Observación</p>
                        <p className="mt-2 font-medium">
                          {selectedDetail.observacion ?? "Sin observaciones registradas."}
                        </p>
                      </div>
                    </TabsContent>

                    <TabsContent value="orden-carga" className="space-y-4">
                      {ordenCarga ? (
                        <>
                          <WmsDetailFieldGrid
                            fields={[
                              {
                                label: "Transportista",
                                value:
                                  ordenCarga.transportistaRazonSocial ??
                                  transportistaName(ordenCarga.transportistaId),
                              },
                              {
                                label: "Fecha de carga",
                                value: formatDate(ordenCarga.fechaCarga),
                              },
                              { label: "Origen", value: ordenCarga.origen },
                              { label: "Destino", value: ordenCarga.destino },
                              { label: "Patente", value: ordenCarga.patente ?? "Sin informar" },
                              {
                                label: "Confirmada",
                                value: ordenCarga.confirmada ? "Sí" : "No",
                              },
                            ]}
                          />
                          <div className="rounded-lg border p-4">
                            <p className="text-sm text-muted-foreground">Observación</p>
                            <p className="mt-2 font-medium">
                              {ordenCarga.observacion ?? "Sin observaciones"}
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                          La carta todavía no tiene orden de carga asociada.
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="historial" className="space-y-3">
                      {historial.length ? (
                        historial.map((evento) => (
                          <div key={evento.id} className="rounded-lg border p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-medium">{evento.tipoEvento}</p>
                                <p className="text-sm text-muted-foreground">
                                  {evento.mensaje ?? "Sin mensaje adicional."}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {evento.estadoAnterior
                                    ? `${estadoLabel(evento.estadoAnterior)} -> ${estadoLabel(evento.estadoNuevo)}`
                                    : estadoLabel(evento.estadoNuevo)}
                                </p>
                                {evento.nroCtg ? (
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    CTG {evento.nroCtg}
                                  </p>
                                ) : null}
                              </div>
                              <div className="text-right text-xs text-muted-foreground">
                                <p>{formatDate(evento.fechaEvento)}</p>
                                <p>{formatDateTime(evento.createdAt)}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                          No hay historial visible para la carta seleccionada.
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No fue posible cargar el detalle de la carta seleccionada.
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No hay carta de porte seleccionada.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <WmsDialogContent size="md">
          <DialogHeader>
            <DialogTitle>Nueva carta de porte</DialogTitle>
            <DialogDescription>
              El alta usa el contrato real del backend: comprobante opcional, CUITs, fecha de
              emisión y observación. La vinculación directa del transportista se completa luego en
              la orden de carga; acá la selección solo sirve para autocompletar el CUIT.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Comprobante origen</Label>
              <Input
                type="number"
                min={1}
                value={createDraft.comprobanteId}
                onChange={(event) =>
                  setCreateDraft((current) => ({ ...current, comprobanteId: event.target.value }))
                }
                placeholder="Opcional"
              />
            </div>
            <div className="space-y-2">
              <Label>CUIT remitente</Label>
              <Input
                value={createDraft.cuitRemitente}
                onChange={(event) =>
                  setCreateDraft((current) => ({ ...current, cuitRemitente: event.target.value }))
                }
                placeholder="11 dígitos"
              />
            </div>
            <div className="space-y-2">
              <Label>CUIT destinatario</Label>
              <Input
                value={createDraft.cuitDestinatario}
                onChange={(event) =>
                  setCreateDraft((current) => ({
                    ...current,
                    cuitDestinatario: event.target.value,
                  }))
                }
                placeholder="11 dígitos"
              />
            </div>
            <div className="space-y-2">
              <Label>Transportista (autocompleta CUIT)</Label>
              <Select
                value={createDraft.transportistaId}
                onValueChange={(value) => {
                  setCreateDraft((current) => {
                    if (value === "none") {
                      const previousTransportistaId =
                        current.transportistaId === "none"
                          ? undefined
                          : Number(current.transportistaId)
                      const previousAutoFilledCuit = getTransportistaCuit(previousTransportistaId)

                      return {
                        ...current,
                        transportistaId: value,
                        cuitTransportista:
                          current.cuitTransportista === previousAutoFilledCuit
                            ? ""
                            : current.cuitTransportista,
                      }
                    }

                    const autoFilledCuit = getTransportistaCuit(Number(value))

                    return {
                      ...current,
                      transportistaId: value,
                      cuitTransportista: autoFilledCuit || current.cuitTransportista,
                    }
                  })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin transportista</SelectItem>
                  {transportistas.map((transportista) => (
                    <SelectItem key={transportista.id} value={String(transportista.id)}>
                      {transportista.terceroRazonSocial ?? `Transportista #${transportista.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>CUIT transportista</Label>
              <Input
                value={createDraft.cuitTransportista}
                onChange={(event) =>
                  setCreateDraft((current) => ({
                    ...current,
                    cuitTransportista: event.target.value,
                  }))
                }
                placeholder="Opcional"
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha de emisión</Label>
              <Input
                type="date"
                value={createDraft.fechaEmision}
                onChange={(event) =>
                  setCreateDraft((current) => ({ ...current, fechaEmision: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Observación</Label>
              <Textarea
                value={createDraft.observacion}
                onChange={(event) =>
                  setCreateDraft((current) => ({ ...current, observacion: event.target.value }))
                }
                placeholder="Cereal, cupo, referencia o contexto operativo"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleCreate()} disabled={busyAction === "crear"}>
              {busyAction === "crear" ? "Guardando..." : "Crear carta"}
            </Button>
          </DialogFooter>
        </WmsDialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <WmsDialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Asignar CTG</DialogTitle>
            <DialogDescription>
              Carga manual del número CTG para la carta seleccionada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>CTG</Label>
              <Input
                value={ctgDraft.nroCtg}
                onChange={(event) => setCtgDraft({ nroCtg: event.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleAssignCtg()} disabled={busyAction === "ctg"}>
              {busyAction === "ctg" ? "Guardando..." : "Asignar"}
            </Button>
          </DialogFooter>
        </WmsDialogContent>
      </Dialog>

      <Dialog open={orderOpen} onOpenChange={setOrderOpen}>
        <WmsDialogContent size="md">
          <DialogHeader>
            <DialogTitle>Crear orden de carga</DialogTitle>
            <DialogDescription>
              Asociá la planificación física del viaje con origen, destino y transportista.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Transportista</Label>
              <Select
                value={orderDraft.transportistaId}
                onValueChange={(value) =>
                  setOrderDraft((current) => ({ ...current, transportistaId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin transportista</SelectItem>
                  {transportistas.map((transportista) => (
                    <SelectItem key={transportista.id} value={String(transportista.id)}>
                      {transportista.terceroRazonSocial ?? `Transportista #${transportista.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fecha de carga</Label>
              <Input
                type="date"
                value={orderDraft.fechaCarga}
                onChange={(event) =>
                  setOrderDraft((current) => ({ ...current, fechaCarga: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Origen</Label>
              <Input
                value={orderDraft.origen}
                onChange={(event) =>
                  setOrderDraft((current) => ({ ...current, origen: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Destino</Label>
              <Input
                value={orderDraft.destino}
                onChange={(event) =>
                  setOrderDraft((current) => ({ ...current, destino: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Patente</Label>
              <Input
                value={orderDraft.patente}
                onChange={(event) =>
                  setOrderDraft((current) => ({ ...current, patente: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Observación</Label>
              <Textarea
                value={orderDraft.observacion}
                onChange={(event) =>
                  setOrderDraft((current) => ({ ...current, observacion: event.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrderOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => void handleCrearOrdenCarga()}
              disabled={busyAction === "orden-carga"}
            >
              {busyAction === "orden-carga" ? "Guardando..." : "Crear orden"}
            </Button>
          </DialogFooter>
        </WmsDialogContent>
      </Dialog>

      <Dialog open={solicitarOpen} onOpenChange={setSolicitarOpen}>
        <WmsDialogContent size="md">
          <DialogHeader>
            <DialogTitle>Solicitar CTG</DialogTitle>
            <DialogDescription>
              Registra el inicio o reintento de la gestión AFIP para la carta seleccionada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Fecha de solicitud</Label>
              <Input
                type="date"
                value={solicitarDraft.fechaSolicitud}
                onChange={(event) =>
                  setSolicitarDraft((current) => ({
                    ...current,
                    fechaSolicitud: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Observación</Label>
              <Textarea
                value={solicitarDraft.observacion}
                onChange={(event) =>
                  setSolicitarDraft((current) => ({ ...current, observacion: event.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSolicitarOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => void handleSolicitarCtg(false)}
              disabled={busyAction === "solicitar-ctg" || busyAction === "reintentar-ctg"}
            >
              {busyAction === "solicitar-ctg" || busyAction === "reintentar-ctg"
                ? "Guardando..."
                : "Registrar solicitud"}
            </Button>
          </DialogFooter>
        </WmsDialogContent>
      </Dialog>

      <Dialog open={consultarOpen} onOpenChange={setConsultarOpen}>
        <WmsDialogContent size="md">
          <DialogHeader>
            <DialogTitle>Consultar CTG</DialogTitle>
            <DialogDescription>
              Cargá la respuesta o el seguimiento AFIP con CTG, error u observación.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Fecha de consulta</Label>
              <Input
                type="date"
                value={consultarDraft.fechaConsulta}
                onChange={(event) =>
                  setConsultarDraft((current) => ({
                    ...current,
                    fechaConsulta: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>CTG recibido</Label>
              <Input
                value={consultarDraft.nroCtg}
                onChange={(event) =>
                  setConsultarDraft((current) => ({ ...current, nroCtg: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Error</Label>
              <Textarea
                value={consultarDraft.error}
                onChange={(event) =>
                  setConsultarDraft((current) => ({ ...current, error: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Observación</Label>
              <Textarea
                value={consultarDraft.observacion}
                onChange={(event) =>
                  setConsultarDraft((current) => ({ ...current, observacion: event.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConsultarOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => void handleConsultarCtg()}
              disabled={busyAction === "consultar-ctg"}
            >
              {busyAction === "consultar-ctg" ? "Guardando..." : "Registrar consulta"}
            </Button>
          </DialogFooter>
        </WmsDialogContent>
      </Dialog>

      <Dialog open={anularOpen} onOpenChange={setAnularOpen}>
        <WmsDialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Anular carta de porte</DialogTitle>
            <DialogDescription>
              La anulación usa el workflow documental del backend y queda registrada en historial.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={anularDraft.fecha}
                onChange={(event) =>
                  setAnularDraft((current) => ({ ...current, fecha: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Observación</Label>
              <Textarea
                value={anularDraft.observacion}
                onChange={(event) =>
                  setAnularDraft((current) => ({ ...current, observacion: event.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnularOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleAnular()}
              disabled={busyAction === "anular"}
            >
              {busyAction === "anular" ? "Anulando..." : "Anular carta"}
            </Button>
          </DialogFooter>
        </WmsDialogContent>
      </Dialog>
    </div>
  )
}
