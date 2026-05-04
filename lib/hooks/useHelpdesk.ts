import { useState, useEffect, useCallback } from "react"
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api"
import type {
  HDTicket,
  HDTicketComment,
  HDServicio,
  HDOrdenServicio,
  HDSLA,
  HDContrato,
  HDAgente,
  HDCliente,
  HDFacturaServicio,
  HDCategoriaServicio,
  HDDashboardSummary,
  HDSegmentedDashboard,
  HDReport,
} from "@/lib/types"

type PagedResult<T> = { items: T[]; total: number; page: number; size: number }

type HdTicketWriteModel = Omit<HDTicket, "id" | "createdAt" | "updatedAt">
type HdTicketApiModel = Omit<HDTicket, "cumpleSLA"> & {
  cumpleSla?: boolean
  cumpleSLA?: boolean
}
type HdClienteApiModel = HDCliente & {
  terceroId?: string
}
type HdClienteWriteModel = Omit<
  HdClienteApiModel,
  "id" | "createdAt" | "updatedAt" | "fechaInicioContrato" | "fechaFinContrato"
> & {
  fechaInicioContrato?: HDCliente["fechaInicioContrato"] | string
  fechaFinContrato?: HDCliente["fechaFinContrato"] | string
}
type HdOrdenWriteModel = Omit<HDOrdenServicio, "id" | "createdAt" | "updatedAt">
type HdFacturaWriteModel = Omit<HDFacturaServicio, "id" | "createdAt" | "updatedAt">
type HdContratoWriteModel = Omit<HDContrato, "id" | "createdAt" | "updatedAt">
type HdTicketCommentCreateInput = Pick<
  HDTicketComment,
  "usuarioId" | "texto" | "esInterno" | "fechaHora" | "adjuntos"
>

function toArray<T>(r: T[] | PagedResult<T>): T[] {
  return Array.isArray(r) ? r : r.items
}

function toQueryDate(value: Date | string) {
  if (value instanceof Date) return value.toISOString()

  const parsedDate = new Date(value)
  return Number.isNaN(parsedDate.getTime()) ? value : parsedDate.toISOString()
}

function toDateOnly(value?: Date | string | null) {
  if (!value) return value
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value

  const parsedDate = value instanceof Date ? value : new Date(value)
  return Number.isNaN(parsedDate.getTime()) ? value : parsedDate.toISOString().slice(0, 10)
}

function buildDateRangeQuery(filters?: {
  desde?: Date | string | null
  hasta?: Date | string | null
}) {
  const params = new URLSearchParams()

  if (filters?.desde) {
    params.set("desde", toQueryDate(filters.desde))
  }

  if (filters?.hasta) {
    params.set("hasta", toQueryDate(filters.hasta))
  }

  const query = params.toString()
  return query ? `?${query}` : ""
}

function normalizeHdTicket(ticket: HdTicketApiModel): HDTicket {
  const { cumpleSla, cumpleSLA, ...rest } = ticket

  return {
    ...rest,
    cumpleSLA: cumpleSLA ?? cumpleSla ?? false,
  }
}

function buildHdTicketPayload(ticket: HdTicketWriteModel) {
  return {
    numero: ticket.numero,
    asunto: ticket.asunto,
    descripcion: ticket.descripcion,
    clienteId: ticket.clienteId,
    contactoId: ticket.contactoId,
    categoria: ticket.categoria,
    prioridad: ticket.prioridad,
    estado: ticket.estado,
    canal: ticket.canal,
    asignadoAId: ticket.asignadoAId,
    departamentoId: ticket.departamentoId,
    slaId: ticket.slaId,
    fechaCreacion: ticket.fechaCreacion,
    fechaPrimeraRespuesta: ticket.fechaPrimeraRespuesta,
    fechaResolucion: ticket.fechaResolucion,
    fechaCierre: ticket.fechaCierre,
    tiempoRespuesta: ticket.tiempoRespuesta,
    tiempoResolucion: ticket.tiempoResolucion,
    cumpleSla: ticket.cumpleSLA,
    ticketsRelacionados: ticket.ticketsRelacionados,
    adjuntos: ticket.adjuntos,
    tags: ticket.tags,
  }
}

function buildHdClientePayload(cliente: HdClienteWriteModel) {
  return {
    terceroId: cliente.terceroId,
    codigo: cliente.codigo,
    nombre: cliente.nombre,
    tipoCliente: cliente.tipoCliente,
    email: cliente.email,
    telefono: cliente.telefono,
    direccion: cliente.direccion,
    slaId: cliente.slaId,
    contratoActivo: cliente.contratoActivo,
    fechaInicioContrato: toDateOnly(cliente.fechaInicioContrato),
    fechaFinContrato: toDateOnly(cliente.fechaFinContrato),
    limiteTicketsMes: cliente.limiteTicketsMes,
    ticketsUsadosMes: cliente.ticketsUsadosMes,
    notas: cliente.notas,
    contactos: cliente.contactos.map((contacto) => ({
      nombre: contacto.nombre,
      apellido: contacto.apellido,
      email: contacto.email,
      telefono: contacto.telefono,
      cargo: contacto.cargo,
      esPrincipal: contacto.esPrincipal,
    })),
  }
}

function buildHdOrdenPayload(orden: HdOrdenWriteModel) {
  return {
    numero: orden.numero,
    ticketId: orden.ticketId,
    clienteId: orden.clienteId,
    contactoId: orden.contactoId,
    servicioId: orden.servicioId,
    tecnicoAsignadoId: orden.tecnicoAsignadoId,
    estado: orden.estado,
    prioridad: orden.prioridad,
    fechaProgramada: orden.fechaProgramada,
    fechaInicio: orden.fechaInicio,
    fechaFin: orden.fechaFin,
    duracionReal: orden.duracionReal,
    direccionServicio: orden.direccionServicio,
    descripcionTrabajo: orden.descripcionTrabajo,
    observaciones: orden.observaciones,
    recursosUtilizados: orden.recursosUtilizados,
    firmaCliente: orden.firmaCliente,
    calificacion: orden.calificacion,
    comentarioCliente: orden.comentarioCliente,
  }
}

function buildHdFacturaPayload(factura: HdFacturaWriteModel) {
  return {
    numero: factura.numero,
    clienteId: factura.clienteId,
    ordenesServicioIds: factura.ordenesServicioIds,
    fecha: toDateOnly(factura.fecha),
    fechaVencimiento: toDateOnly(factura.fechaVencimiento),
    estado: factura.estado,
    items: factura.items,
    subtotal: factura.subtotal,
    descuento: factura.descuento,
    impuestos: factura.impuestos,
    total: factura.total,
    moneda: factura.moneda,
    metodoPago: factura.metodoPago,
    referenciaPago: factura.referenciaPago,
    notas: factura.notas,
  }
}

function buildHdContratoPayload(contrato: HdContratoWriteModel) {
  return {
    numero: contrato.numero,
    clienteId: contrato.clienteId,
    nombre: contrato.nombre,
    tipo: contrato.tipo,
    estado: contrato.estado,
    fechaInicio: toDateOnly(contrato.fechaInicio),
    fechaFin: toDateOnly(contrato.fechaFin),
    valorMensual: contrato.valorMensual,
    valorTotal: contrato.valorTotal,
    serviciosIncluidos: contrato.serviciosIncluidos ?? [],
    horasIncluidas: contrato.horasIncluidas ?? 0,
    horasConsumidas: contrato.horasConsumidas,
    slaId: contrato.slaId || undefined,
    renovacionAutomatica: contrato.renovacionAutomatica,
    condiciones: contrato.condiciones,
  }
}

// ─── Tickets ──────────────────────────────────────────────────────────────────

export function useHdTickets() {
  const [tickets, setTickets] = useState<HDTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  async function fetchTicketById(id: string) {
    const ticket = await apiGet<HdTicketApiModel>(`/api/helpdesk/tickets/${id}`)
    return normalizeHdTicket(ticket)
  }

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const url = `/api/helpdesk/tickets?size=200${search ? `&busqueda=${encodeURIComponent(search)}` : ""}`
      const res = await apiGet<HdTicketApiModel[] | PagedResult<HdTicketApiModel>>(url)
      setTickets(toArray(res).map(normalizeHdTicket))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando tickets")
      setTickets([])
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  async function createTicket(dto: HdTicketWriteModel) {
    const created = normalizeHdTicket(
      await apiPost<HdTicketApiModel>("/api/helpdesk/tickets", buildHdTicketPayload(dto))
    )
    setTickets((prev) => [created, ...prev])
    return created
  }

  async function updateTicket(id: string, dto: Partial<HDTicket>) {
    const currentTicket = tickets.find((ticket) => ticket.id === id) ?? (await fetchTicketById(id))
    const updated = normalizeHdTicket(
      await apiPut<HdTicketApiModel>(`/api/helpdesk/tickets/${id}`, {
        ...buildHdTicketPayload(currentTicket),
        ...buildHdTicketPayload({
          ...currentTicket,
          ...dto,
          cumpleSLA: dto.cumpleSLA ?? currentTicket.cumpleSLA,
        }),
      })
    )
    setTickets((prev) => prev.map((t) => (t.id === id ? updated : t)))
    return updated
  }

  async function deleteTicket(id: string) {
    await apiDelete(`/api/helpdesk/tickets/${id}`)
    setTickets((prev) => prev.filter((t) => t.id !== id))
  }

  async function addComment(ticketId: string, dto: HdTicketCommentCreateInput) {
    return apiPost<HDTicketComment>(`/api/helpdesk/tickets/${ticketId}/comentarios`, dto)
  }

  return {
    tickets,
    loading,
    error,
    search,
    setSearch,
    createTicket,
    updateTicket,
    deleteTicket,
    addComment,
    refetch: fetchTickets,
  }
}

// ─── Agentes ──────────────────────────────────────────────────────────────────

export function useHdAgentes() {
  const [agentes, setAgentes] = useState<HDAgente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAgentes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiGet<HDAgente[] | PagedResult<HDAgente>>("/api/helpdesk/agentes?size=200")
      setAgentes(toArray(res))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando agentes")
      setAgentes([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAgentes()
  }, [fetchAgentes])

  async function createAgente(dto: Omit<HDAgente, "id" | "createdAt" | "updatedAt">) {
    const created = await apiPost<HDAgente>("/api/helpdesk/agentes", dto)
    setAgentes((prev) => [created, ...prev])
    return created
  }

  async function updateAgente(id: string, dto: Partial<HDAgente>) {
    const updated = await apiPut<HDAgente>(`/api/helpdesk/agentes/${id}`, dto)
    setAgentes((prev) => prev.map((a) => (a.id === id ? updated : a)))
    return updated
  }

  async function deleteAgente(id: string) {
    await apiDelete(`/api/helpdesk/agentes/${id}`)
    setAgentes((prev) => prev.filter((a) => a.id !== id))
  }

  return {
    agentes,
    loading,
    error,
    createAgente,
    updateAgente,
    deleteAgente,
    refetch: fetchAgentes,
  }
}

// ─── Contratos ────────────────────────────────────────────────────────────────

export function useHdContratos() {
  const [contratos, setContratos] = useState<HDContrato[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchContratos = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiGet<HDContrato[] | PagedResult<HDContrato>>(
        "/api/helpdesk/contratos?size=200"
      )
      setContratos(toArray(res))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando contratos")
      setContratos([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchContratos()
  }, [fetchContratos])

  async function createContrato(dto: HdContratoWriteModel) {
    const created = await apiPost<HDContrato>(
      "/api/helpdesk/contratos",
      buildHdContratoPayload(dto)
    )
    setContratos((prev) => [created, ...prev])
    return created
  }

  async function updateContrato(id: string, dto: Partial<HdContratoWriteModel>) {
    const currentContrato = contratos.find((contrato) => contrato.id === id)

    if (!currentContrato) {
      throw new Error(`Contrato ${id} no encontrado en el estado local`)
    }

    const nextContrato = { ...currentContrato, ...dto } as HdContratoWriteModel
    const updated = await apiPut<HDContrato>(
      `/api/helpdesk/contratos/${id}`,
      buildHdContratoPayload(nextContrato)
    )
    setContratos((prev) => prev.map((c) => (c.id === id ? updated : c)))
    return updated
  }

  async function deleteContrato(id: string) {
    await apiDelete(`/api/helpdesk/contratos/${id}`)
    setContratos((prev) => prev.filter((c) => c.id !== id))
  }

  return {
    contratos,
    loading,
    error,
    createContrato,
    updateContrato,
    deleteContrato,
    refetch: fetchContratos,
  }
}

// ─── Servicios ────────────────────────────────────────────────────────────────

export function useHdServicios() {
  const [servicios, setServicios] = useState<HDServicio[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchServicios = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiGet<HDServicio[] | PagedResult<HDServicio>>(
        "/api/helpdesk/servicios?size=200"
      )
      setServicios(toArray(res))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando servicios")
      setServicios([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchServicios()
  }, [fetchServicios])

  async function createServicio(dto: Omit<HDServicio, "id" | "createdAt" | "updatedAt">) {
    const created = await apiPost<HDServicio>("/api/helpdesk/servicios", dto)
    setServicios((prev) => [created, ...prev])
    return created
  }

  async function updateServicio(id: string, dto: Partial<HDServicio>) {
    const updated = await apiPut<HDServicio>(`/api/helpdesk/servicios/${id}`, dto)
    setServicios((prev) => prev.map((s) => (s.id === id ? updated : s)))
    return updated
  }

  async function deleteServicio(id: string) {
    await apiDelete(`/api/helpdesk/servicios/${id}`)
    setServicios((prev) => prev.filter((s) => s.id !== id))
  }

  return {
    servicios,
    loading,
    error,
    createServicio,
    updateServicio,
    deleteServicio,
    refetch: fetchServicios,
  }
}

export function useHdCategorias() {
  const [categorias, setCategorias] = useState<HDCategoriaServicio[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCategorias = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiGet<HDCategoriaServicio[] | PagedResult<HDCategoriaServicio>>(
        "/api/helpdesk/categorias?size=200"
      )
      setCategorias(toArray(res))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando categorias de servicios")
      setCategorias([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategorias()
  }, [fetchCategorias])

  return { categorias, loading, error, refetch: fetchCategorias }
}

export function useHdDashboard(filters?: {
  desde?: Date | string | null
  hasta?: Date | string | null
}) {
  const [dashboard, setDashboard] = useState<HDDashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const query = buildDateRangeQuery(filters)
      const result = await apiGet<HDDashboardSummary>(`/api/helpdesk/dashboard${query}`)
      setDashboard(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando dashboard helpdesk")
      setDashboard(null)
    } finally {
      setLoading(false)
    }
  }, [filters?.desde, filters?.hasta])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  return { dashboard, loading, error, refetch: fetchDashboard }
}

export function useHdSegmentedDashboard(filters?: {
  departamentoId?: string | null
  agenteId?: string | null
  severidad?: string | null
  desde?: Date | string | null
  hasta?: Date | string | null
}) {
  const [segmentedDashboard, setSegmentedDashboard] = useState<HDSegmentedDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSegmentedDashboard = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()

      if (filters?.departamentoId) {
        params.set("departamentoId", filters.departamentoId)
      }

      if (filters?.agenteId) {
        params.set("agenteId", filters.agenteId)
      }

      if (filters?.severidad) {
        params.set("severidad", filters.severidad)
      }

      if (filters?.desde) {
        params.set("desde", toQueryDate(filters.desde))
      }

      if (filters?.hasta) {
        params.set("hasta", toQueryDate(filters.hasta))
      }

      const query = params.toString()
      const result = await apiGet<HDSegmentedDashboard>(
        `/api/helpdesk/dashboard/segmentado${query ? `?${query}` : ""}`
      )
      setSegmentedDashboard(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando dashboard segmentado")
      setSegmentedDashboard(null)
    } finally {
      setLoading(false)
    }
  }, [
    filters?.agenteId,
    filters?.departamentoId,
    filters?.desde,
    filters?.hasta,
    filters?.severidad,
  ])

  useEffect(() => {
    fetchSegmentedDashboard()
  }, [fetchSegmentedDashboard])

  return { segmentedDashboard, loading, error, refetch: fetchSegmentedDashboard }
}

export function useHdReport(filters?: {
  desde?: Date | string | null
  hasta?: Date | string | null
}) {
  const [report, setReport] = useState<HDReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const query = buildDateRangeQuery(filters)
      const result = await apiGet<HDReport>(`/api/helpdesk/reportes${query}`)
      setReport(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando reportes helpdesk")
      setReport(null)
    } finally {
      setLoading(false)
    }
  }, [filters?.desde, filters?.hasta])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  return { report, loading, error, refetch: fetchReport }
}

// ─── SLAs ─────────────────────────────────────────────────────────────────────

export function useHdSlas() {
  const [slas, setSlas] = useState<HDSLA[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSlas = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiGet<HDSLA[] | PagedResult<HDSLA>>("/api/helpdesk/slas?size=200")
      setSlas(toArray(res))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando SLAs")
      setSlas([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSlas()
  }, [fetchSlas])

  async function createSla(dto: Omit<HDSLA, "id" | "createdAt" | "updatedAt">) {
    const created = await apiPost<HDSLA>("/api/helpdesk/slas", dto)
    setSlas((prev) => [created, ...prev])
    return created
  }

  async function updateSla(id: string, dto: Partial<HDSLA>) {
    const updated = await apiPut<HDSLA>(`/api/helpdesk/slas/${id}`, dto)
    setSlas((prev) => prev.map((s) => (s.id === id ? updated : s)))
    return updated
  }

  async function deleteSla(id: string) {
    await apiDelete(`/api/helpdesk/slas/${id}`)
    setSlas((prev) => prev.filter((s) => s.id !== id))
  }

  return { slas, loading, error, createSla, updateSla, deleteSla, refetch: fetchSlas }
}

// ─── Órdenes de Servicio ──────────────────────────────────────────────────────

export function useHdOrdenesServicio(ticketId?: string) {
  const [ordenes, setOrdenes] = useState<HDOrdenServicio[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrdenes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const url = `/api/helpdesk/ordenes-servicio?size=200${ticketId ? `&ticketId=${ticketId}` : ""}`
      const res = await apiGet<HDOrdenServicio[] | PagedResult<HDOrdenServicio>>(url)
      setOrdenes(toArray(res))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando órdenes de servicio")
      setOrdenes([])
    } finally {
      setLoading(false)
    }
  }, [ticketId])

  useEffect(() => {
    fetchOrdenes()
  }, [fetchOrdenes])

  async function createOrden(dto: HdOrdenWriteModel) {
    const created = await apiPost<HDOrdenServicio>(
      "/api/helpdesk/ordenes-servicio",
      buildHdOrdenPayload(dto)
    )
    setOrdenes((prev) => [created, ...prev])
    return created
  }

  async function updateOrden(id: string, dto: Partial<HDOrdenServicio>) {
    const currentOrder = ordenes.find((orden) => orden.id === id)

    if (!currentOrder) {
      throw new Error(`Orden de servicio Help Desk ${id} no encontrada en memoria.`)
    }

    const updated = await apiPut<HDOrdenServicio>(`/api/helpdesk/ordenes-servicio/${id}`, {
      ...buildHdOrdenPayload(currentOrder),
      ...buildHdOrdenPayload({
        ...currentOrder,
        ...dto,
      }),
    })
    setOrdenes((prev) => prev.map((o) => (o.id === id ? updated : o)))
    return updated
  }

  async function deleteOrden(id: string) {
    await apiDelete(`/api/helpdesk/ordenes-servicio/${id}`)
    setOrdenes((prev) => prev.filter((o) => o.id !== id))
  }

  return { ordenes, loading, error, createOrden, updateOrden, deleteOrden, refetch: fetchOrdenes }
}

// ─── Clientes Helpdesk ────────────────────────────────────────────────────────

export function useHdClientes() {
  const [clientes, setClientes] = useState<HDCliente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClientes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiGet<HdClienteApiModel[] | PagedResult<HdClienteApiModel>>(
        "/api/helpdesk/clientes?size=200"
      )
      setClientes(toArray(res))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando clientes helpdesk")
      setClientes([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClientes()
  }, [fetchClientes])

  async function createCliente(dto: HdClienteWriteModel) {
    const created = await apiPost<HdClienteApiModel>(
      "/api/helpdesk/clientes",
      buildHdClientePayload(dto)
    )
    setClientes((prev) => [created, ...prev])
    return created
  }

  async function updateCliente(id: string, dto: Partial<HdClienteApiModel>) {
    const currentClient = clientes.find((cliente) => cliente.id === id)

    if (!currentClient) {
      throw new Error(`Cliente Help Desk ${id} no encontrado en memoria.`)
    }

    const updated = await apiPut<HdClienteApiModel>(`/api/helpdesk/clientes/${id}`, {
      ...buildHdClientePayload(currentClient),
      ...buildHdClientePayload({
        ...currentClient,
        ...dto,
        contactos: dto.contactos ?? currentClient.contactos,
      }),
    })
    setClientes((prev) => prev.map((cliente) => (cliente.id === id ? updated : cliente)))
    return updated
  }

  async function deleteCliente(id: string) {
    await apiDelete(`/api/helpdesk/clientes/${id}`)
    setClientes((prev) => prev.filter((cliente) => cliente.id !== id))
  }

  return {
    clientes,
    loading,
    error,
    createCliente,
    updateCliente,
    deleteCliente,
    refetch: fetchClientes,
  }
}

// ─── Facturación HD ───────────────────────────────────────────────────────────

export function useHdFacturacion() {
  const [facturas, setFacturas] = useState<HDFacturaServicio[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFacturas = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiGet<HDFacturaServicio[] | PagedResult<HDFacturaServicio>>(
        "/api/helpdesk/facturas?size=200"
      )
      setFacturas(toArray(res))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando facturas helpdesk")
      setFacturas([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFacturas()
  }, [fetchFacturas])

  async function createFactura(dto: HdFacturaWriteModel) {
    const created = await apiPost<HDFacturaServicio>(
      "/api/helpdesk/facturas",
      buildHdFacturaPayload(dto)
    )
    setFacturas((prev) => [created, ...prev])
    return created
  }

  async function updateFactura(id: string, dto: Partial<HDFacturaServicio>) {
    const currentFactura = facturas.find((factura) => factura.id === id)

    if (!currentFactura) {
      throw new Error(`Factura Help Desk ${id} no encontrada en memoria.`)
    }

    const updated = await apiPut<HDFacturaServicio>(`/api/helpdesk/facturas/${id}`, {
      ...buildHdFacturaPayload(currentFactura),
      ...buildHdFacturaPayload({
        ...currentFactura,
        ...dto,
      }),
    })
    setFacturas((prev) => prev.map((f) => (f.id === id ? updated : f)))
    return updated
  }

  async function deleteFactura(id: string) {
    await apiDelete(`/api/helpdesk/facturas/${id}`)
    setFacturas((prev) => prev.filter((f) => f.id !== id))
  }

  return {
    facturas,
    loading,
    error,
    createFactura,
    updateFactura,
    deleteFactura,
    refetch: fetchFacturas,
  }
}
