import { useState, useEffect, useCallback } from "react"
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api"
import type {
  CRMClient,
  CRMContact,
  CRMOpportunity,
  CRMInteraction,
  CRMTask,
  CRMCampaign,
  CRMSegment,
  CRMUser,
} from "@/lib/types"

type PagedResult<T> = { items: T[]; total: number; page: number; size: number }

function toArray<T>(r: T[] | PagedResult<T>): T[] {
  return Array.isArray(r) ? r : r.items
}

// ─── CRM Clientes ─────────────────────────────────────────────────────────────

export function useCrmClientes() {
  const [clientes, setClientes] = useState<CRMClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const fetchClientes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const url = `/api/crm/clientes?size=200${search ? `&busqueda=${encodeURIComponent(search)}` : ""}`
      const res = await apiGet<CRMClient[] | PagedResult<CRMClient>>(url)
      setClientes(toArray(res))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando clientes CRM")
      setClientes([])
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    fetchClientes()
  }, [fetchClientes])

  async function createCliente(dto: Omit<CRMClient, "id" | "createdAt" | "updatedAt">) {
    const created = await apiPost<CRMClient>("/api/crm/clientes", dto)
    setClientes((prev) => [created, ...prev])
    return created
  }

  async function updateCliente(id: string, dto: Partial<CRMClient>) {
    const updated = await apiPut<CRMClient>(`/api/crm/clientes/${id}`, dto)
    setClientes((prev) => prev.map((c) => (c.id === id ? updated : c)))
    return updated
  }

  async function deleteCliente(id: string) {
    await apiDelete(`/api/crm/clientes/${id}`)
    setClientes((prev) => prev.filter((c) => c.id !== id))
  }

  return {
    clientes,
    loading,
    error,
    search,
    setSearch,
    createCliente,
    updateCliente,
    deleteCliente,
    refetch: fetchClientes,
  }
}

// ─── CRM Contactos ────────────────────────────────────────────────────────────

export function useCrmContactos(clienteId?: string) {
  const [contactos, setContactos] = useState<CRMContact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchContactos = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const url = `/api/crm/contactos?size=200${clienteId ? `&clienteId=${clienteId}` : ""}`
      const res = await apiGet<CRMContact[] | PagedResult<CRMContact>>(url)
      setContactos(toArray(res))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando contactos")
      setContactos([])
    } finally {
      setLoading(false)
    }
  }, [clienteId])

  useEffect(() => {
    fetchContactos()
  }, [fetchContactos])

  async function createContacto(dto: Omit<CRMContact, "id" | "createdAt" | "updatedAt">) {
    const created = await apiPost<CRMContact>("/api/crm/contactos", dto)
    setContactos((prev) => [created, ...prev])
    return created
  }

  async function updateContacto(id: string, dto: Partial<CRMContact>) {
    const updated = await apiPut<CRMContact>(`/api/crm/contactos/${id}`, dto)
    setContactos((prev) => prev.map((c) => (c.id === id ? updated : c)))
    return updated
  }

  async function deleteContacto(id: string) {
    await apiDelete(`/api/crm/contactos/${id}`)
    setContactos((prev) => prev.filter((c) => c.id !== id))
  }

  return {
    contactos,
    loading,
    error,
    createContacto,
    updateContacto,
    deleteContacto,
    refetch: fetchContactos,
  }
}

// ─── CRM Oportunidades ────────────────────────────────────────────────────────

export function useCrmOportunidades(clienteId?: string) {
  const [oportunidades, setOportunidades] = useState<CRMOpportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOportunidades = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const url = `/api/crm/oportunidades?size=200${clienteId ? `&clienteId=${clienteId}` : ""}`
      const res = await apiGet<CRMOpportunity[] | PagedResult<CRMOpportunity>>(url)
      setOportunidades(toArray(res))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando oportunidades")
      setOportunidades([])
    } finally {
      setLoading(false)
    }
  }, [clienteId])

  useEffect(() => {
    fetchOportunidades()
  }, [fetchOportunidades])

  async function createOportunidad(dto: Omit<CRMOpportunity, "id" | "createdAt" | "updatedAt">) {
    const created = await apiPost<CRMOpportunity>("/api/crm/oportunidades", dto)
    setOportunidades((prev) => [created, ...prev])
    return created
  }

  async function updateOportunidad(id: string, dto: Partial<CRMOpportunity>) {
    const updated = await apiPut<CRMOpportunity>(`/api/crm/oportunidades/${id}`, dto)
    setOportunidades((prev) => prev.map((o) => (o.id === id ? updated : o)))
    return updated
  }

  async function deleteOportunidad(id: string) {
    await apiDelete(`/api/crm/oportunidades/${id}`)
    setOportunidades((prev) => prev.filter((o) => o.id !== id))
  }

  return {
    oportunidades,
    loading,
    error,
    createOportunidad,
    updateOportunidad,
    deleteOportunidad,
    refetch: fetchOportunidades,
  }
}

// ─── CRM Interacciones ────────────────────────────────────────────────────────

export function useCrmInteracciones(clienteId?: string) {
  const [interacciones, setInteracciones] = useState<CRMInteraction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInteracciones = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const url = `/api/crm/interacciones?size=200${clienteId ? `&clienteId=${clienteId}` : ""}`
      const res = await apiGet<CRMInteraction[] | PagedResult<CRMInteraction>>(url)
      setInteracciones(toArray(res))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando interacciones")
      setInteracciones([])
    } finally {
      setLoading(false)
    }
  }, [clienteId])

  useEffect(() => {
    fetchInteracciones()
  }, [fetchInteracciones])

  async function createInteraccion(dto: Omit<CRMInteraction, "id" | "createdAt" | "updatedAt">) {
    const created = await apiPost<CRMInteraction>("/api/crm/interacciones", dto)
    setInteracciones((prev) => [created, ...prev])
    return created
  }

  async function deleteInteraccion(id: string) {
    await apiDelete(`/api/crm/interacciones/${id}`)
    setInteracciones((prev) => prev.filter((i) => i.id !== id))
  }

  return {
    interacciones,
    loading,
    error,
    createInteraccion,
    deleteInteraccion,
    refetch: fetchInteracciones,
  }
}

// ─── CRM Tareas ───────────────────────────────────────────────────────────────

export function useCrmTareas(clienteId?: string) {
  const [tareas, setTareas] = useState<CRMTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTareas = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const url = `/api/crm/tareas?size=200${clienteId ? `&clienteId=${clienteId}` : ""}`
      const res = await apiGet<CRMTask[] | PagedResult<CRMTask>>(url)
      setTareas(toArray(res))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando tareas")
      setTareas([])
    } finally {
      setLoading(false)
    }
  }, [clienteId])

  useEffect(() => {
    fetchTareas()
  }, [fetchTareas])

  async function createTarea(dto: Omit<CRMTask, "id" | "createdAt" | "updatedAt">) {
    const created = await apiPost<CRMTask>("/api/crm/tareas", dto)
    setTareas((prev) => [created, ...prev])
    return created
  }

  async function updateTarea(id: string, dto: Partial<CRMTask>) {
    const updated = await apiPut<CRMTask>(`/api/crm/tareas/${id}`, dto)
    setTareas((prev) => prev.map((t) => (t.id === id ? updated : t)))
    return updated
  }

  async function deleteTarea(id: string) {
    await apiDelete(`/api/crm/tareas/${id}`)
    setTareas((prev) => prev.filter((t) => t.id !== id))
  }

  return { tareas, loading, error, createTarea, updateTarea, deleteTarea, refetch: fetchTareas }
}

// ─── CRM Campañas ─────────────────────────────────────────────────────────────

export function useCrmCampanas() {
  const [campanas, setCampanas] = useState<CRMCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCampanas = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiGet<CRMCampaign[] | PagedResult<CRMCampaign>>(
        "/api/crm/campanas?size=200"
      )
      setCampanas(toArray(res))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando campañas")
      setCampanas([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCampanas()
  }, [fetchCampanas])

  async function createCampana(dto: Omit<CRMCampaign, "id" | "createdAt" | "updatedAt">) {
    const created = await apiPost<CRMCampaign>("/api/crm/campanas", dto)
    setCampanas((prev) => [created, ...prev])
    return created
  }

  async function updateCampana(id: string, dto: Partial<CRMCampaign>) {
    const updated = await apiPut<CRMCampaign>(`/api/crm/campanas/${id}`, dto)
    setCampanas((prev) => prev.map((c) => (c.id === id ? updated : c)))
    return updated
  }

  async function deleteCampana(id: string) {
    await apiDelete(`/api/crm/campanas/${id}`)
    setCampanas((prev) => prev.filter((c) => c.id !== id))
  }

  return {
    campanas,
    loading,
    error,
    createCampana,
    updateCampana,
    deleteCampana,
    refetch: fetchCampanas,
  }
}

// ─── CRM Segmentos ────────────────────────────────────────────────────────────

export function useCrmSegmentos() {
  const [segmentos, setSegmentos] = useState<CRMSegment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSegmentos = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiGet<CRMSegment[] | PagedResult<CRMSegment>>(
        "/api/crm/segmentos?size=200"
      )
      setSegmentos(toArray(res))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando segmentos")
      setSegmentos([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSegmentos()
  }, [fetchSegmentos])

  async function createSegmento(dto: Omit<CRMSegment, "id" | "createdAt" | "updatedAt">) {
    const created = await apiPost<CRMSegment>("/api/crm/segmentos", dto)
    setSegmentos((prev) => [created, ...prev])
    return created
  }

  async function updateSegmento(id: string, dto: Partial<CRMSegment>) {
    const updated = await apiPut<CRMSegment>(`/api/crm/segmentos/${id}`, dto)
    setSegmentos((prev) => prev.map((s) => (s.id === id ? updated : s)))
    return updated
  }

  async function deleteSegmento(id: string) {
    await apiDelete(`/api/crm/segmentos/${id}`)
    setSegmentos((prev) => prev.filter((s) => s.id !== id))
  }

  return {
    segmentos,
    loading,
    error,
    createSegmento,
    updateSegmento,
    deleteSegmento,
    refetch: fetchSegmentos,
  }
}

// ─── CRM Usuarios ─────────────────────────────────────────────────────────────

export function useCrmUsuarios() {
  const [usuarios, setUsuarios] = useState<CRMUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsuarios = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiGet<CRMUser[] | PagedResult<CRMUser>>("/api/crm/usuarios?size=200")
      setUsuarios(toArray(res))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando usuarios CRM")
      setUsuarios([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsuarios()
  }, [fetchUsuarios])

  async function createUsuario(dto: Omit<CRMUser, "id" | "createdAt" | "updatedAt">) {
    const created = await apiPost<CRMUser>("/api/crm/usuarios", dto)
    await fetchUsuarios()
    return created
  }

  async function updateUsuario(id: string, dto: Partial<CRMUser>) {
    const updated = await apiPut<CRMUser>(`/api/crm/usuarios/${id}`, dto)
    await fetchUsuarios()
    return updated
  }

  async function deleteUsuario(id: string) {
    await apiDelete(`/api/crm/usuarios/${id}`)
    await fetchUsuarios()
  }

  return {
    usuarios,
    loading,
    error,
    createUsuario,
    updateUsuario,
    deleteUsuario,
    refetch: fetchUsuarios,
  }
}
