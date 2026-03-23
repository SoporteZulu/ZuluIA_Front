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
} from "@/lib/types"

type PagedResult<T> = { items: T[]; total: number; page: number; size: number }

function toArray<T>(r: T[] | PagedResult<T>): T[] {
  return Array.isArray(r) ? r : r.items
}

// ─── Tickets ──────────────────────────────────────────────────────────────────

export function useHdTickets() {
  const [tickets, setTickets] = useState<HDTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const url = `/api/helpdesk/tickets?size=200${search ? `&busqueda=${encodeURIComponent(search)}` : ""}`
      const res = await apiGet<HDTicket[] | PagedResult<HDTicket>>(url)
      setTickets(toArray(res))
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

  async function createTicket(dto: Omit<HDTicket, "id" | "createdAt" | "updatedAt">) {
    const created = await apiPost<HDTicket>("/api/helpdesk/tickets", dto)
    setTickets((prev) => [created, ...prev])
    return created
  }

  async function updateTicket(id: string, dto: Partial<HDTicket>) {
    const updated = await apiPut<HDTicket>(`/api/helpdesk/tickets/${id}`, dto)
    setTickets((prev) => prev.map((t) => (t.id === id ? updated : t)))
    return updated
  }

  async function deleteTicket(id: string) {
    await apiDelete(`/api/helpdesk/tickets/${id}`)
    setTickets((prev) => prev.filter((t) => t.id !== id))
  }

  async function addComment(
    ticketId: string,
    dto: Omit<HDTicketComment, "id" | "createdAt" | "updatedAt">
  ) {
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

  async function createContrato(dto: Omit<HDContrato, "id" | "createdAt" | "updatedAt">) {
    const created = await apiPost<HDContrato>("/api/helpdesk/contratos", dto)
    setContratos((prev) => [created, ...prev])
    return created
  }

  async function updateContrato(id: string, dto: Partial<HDContrato>) {
    const updated = await apiPut<HDContrato>(`/api/helpdesk/contratos/${id}`, dto)
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

  async function createOrden(dto: Omit<HDOrdenServicio, "id" | "createdAt" | "updatedAt">) {
    const created = await apiPost<HDOrdenServicio>("/api/helpdesk/ordenes-servicio", dto)
    setOrdenes((prev) => [created, ...prev])
    return created
  }

  async function updateOrden(id: string, dto: Partial<HDOrdenServicio>) {
    const updated = await apiPut<HDOrdenServicio>(`/api/helpdesk/ordenes-servicio/${id}`, dto)
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
      const res = await apiGet<HDCliente[] | PagedResult<HDCliente>>(
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

  return { clientes, loading, error, refetch: fetchClientes }
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

  async function createFactura(dto: Omit<HDFacturaServicio, "id" | "createdAt" | "updatedAt">) {
    const created = await apiPost<HDFacturaServicio>("/api/helpdesk/facturas", dto)
    setFacturas((prev) => [created, ...prev])
    return created
  }

  async function updateFactura(id: string, dto: Partial<HDFacturaServicio>) {
    const updated = await apiPut<HDFacturaServicio>(`/api/helpdesk/facturas/${id}`, dto)
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
