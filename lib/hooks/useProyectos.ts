import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api'
import type { Proyecto, Obra, Entidad, Procedimiento, Miembro, Tarea, Cliente } from '@/lib/proyectos-types'

type PagedResult<T> = { items: T[]; total: number; page: number; size: number }

function toArray<T>(r: T[] | PagedResult<T>): T[] {
  return Array.isArray(r) ? r : r.items
}

// ─── Proyectos ────────────────────────────────────────────────────────────────

export function useProyectos() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  const fetchProyectos = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiGet<Proyecto[] | PagedResult<Proyecto>>('/api/proyectos?size=200')
      setProyectos(toArray(res))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando proyectos')
      setProyectos([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProyectos() }, [fetchProyectos])

  async function createProyecto(dto: Omit<Proyecto, 'id' | 'createdAt' | 'updatedAt'>) {
    const created = await apiPost<Proyecto>('/api/proyectos', dto)
    setProyectos(prev => [created, ...prev])
    return created
  }

  async function updateProyecto(id: string, dto: Partial<Proyecto>) {
    const updated = await apiPut<Proyecto>(`/api/proyectos/${id}`, dto)
    setProyectos(prev => prev.map(p => p.id === id ? updated : p))
    return updated
  }

  async function deleteProyecto(id: string) {
    await apiDelete(`/api/proyectos/${id}`)
    setProyectos(prev => prev.filter(p => p.id !== id))
  }

  return { proyectos, loading, error, createProyecto, updateProyecto, deleteProyecto, refetch: fetchProyectos }
}

// ─── Obras ────────────────────────────────────────────────────────────────────

export function useObras() {
  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetchObras = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiGet<Obra[] | PagedResult<Obra>>('/api/obras?size=200')
      setObras(toArray(res))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando obras')
      setObras([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchObras() }, [fetchObras])

  async function createObra(dto: Omit<Obra, 'id' | 'createdAt' | 'updatedAt'>) {
    const created = await apiPost<Obra>('/api/obras', dto)
    setObras(prev => [created, ...prev])
    return created
  }

  async function updateObra(id: string, dto: Partial<Obra>) {
    const updated = await apiPut<Obra>(`/api/obras/${id}`, dto)
    setObras(prev => prev.map(o => o.id === id ? updated : o))
    return updated
  }

  async function deleteObra(id: string) {
    await apiDelete(`/api/obras/${id}`)
    setObras(prev => prev.filter(o => o.id !== id))
  }

  return { obras, loading, error, createObra, updateObra, deleteObra, refetch: fetchObras }
}

// ─── Entidades ────────────────────────────────────────────────────────────────

export function useEntidades() {
  const [entidades, setEntidades] = useState<Entidad[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  const fetchEntidades = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiGet<Entidad[] | PagedResult<Entidad>>('/api/entidades?size=200')
      setEntidades(toArray(res))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando entidades')
      setEntidades([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchEntidades() }, [fetchEntidades])

  async function createEntidad(dto: Omit<Entidad, 'id' | 'createdAt' | 'updatedAt'>) {
    const created = await apiPost<Entidad>('/api/entidades', dto)
    setEntidades(prev => [created, ...prev])
    return created
  }

  async function updateEntidad(id: string, dto: Partial<Entidad>) {
    const updated = await apiPut<Entidad>(`/api/entidades/${id}`, dto)
    setEntidades(prev => prev.map(e => e.id === id ? updated : e))
    return updated
  }

  async function deleteEntidad(id: string) {
    await apiDelete(`/api/entidades/${id}`)
    setEntidades(prev => prev.filter(e => e.id !== id))
  }

  return { entidades, loading, error, createEntidad, updateEntidad, deleteEntidad, refetch: fetchEntidades }
}

// ─── Procedimientos ───────────────────────────────────────────────────────────

export function useProcedimientos() {
  const [procedimientos, setProcedimientos] = useState<Procedimiento[]>([])
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState<string | null>(null)

  const fetchProcedimientos = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiGet<Procedimiento[] | PagedResult<Procedimiento>>('/api/procedimientos?size=200')
      setProcedimientos(toArray(res))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando procedimientos')
      setProcedimientos([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProcedimientos() }, [fetchProcedimientos])

  return { procedimientos, loading, error, refetch: fetchProcedimientos }
}

// ─── Miembros ─────────────────────────────────────────────────────────────────

export function useMiembros() {
  const [miembros, setMiembros] = useState<Miembro[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  const fetchMiembros = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiGet<Miembro[] | PagedResult<Miembro>>('/api/miembros?size=200')
      setMiembros(toArray(res))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando miembros')
      setMiembros([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMiembros() }, [fetchMiembros])

  async function createMiembro(dto: Omit<Miembro, 'id' | 'createdAt' | 'updatedAt'>) {
    const created = await apiPost<Miembro>('/api/miembros', dto)
    setMiembros(prev => [created, ...prev])
    return created
  }

  async function updateMiembro(id: string, dto: Partial<Miembro>) {
    const updated = await apiPut<Miembro>(`/api/miembros/${id}`, dto)
    setMiembros(prev => prev.map(m => m.id === id ? updated : m))
    return updated
  }

  async function deleteMiembro(id: string) {
    await apiDelete(`/api/miembros/${id}`)
    setMiembros(prev => prev.filter(m => m.id !== id))
  }

  return { miembros, loading, error, createMiembro, updateMiembro, deleteMiembro, refetch: fetchMiembros }
}

// ─── Tareas ───────────────────────────────────────────────────────────────────

export function useTareasProyecto(proyectoId?: string) {
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetchTareas = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const url = `/api/tareas?size=200${proyectoId ? `&proyectoId=${proyectoId}` : ''}`
      const res = await apiGet<Tarea[] | PagedResult<Tarea>>(url)
      setTareas(toArray(res))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando tareas')
      setTareas([])
    } finally {
      setLoading(false)
    }
  }, [proyectoId])

  useEffect(() => { fetchTareas() }, [fetchTareas])

  async function createTarea(dto: Omit<Tarea, 'id' | 'createdAt' | 'updatedAt'>) {
    const created = await apiPost<Tarea>('/api/tareas', dto)
    setTareas(prev => [created, ...prev])
    return created
  }

  async function updateTarea(id: string, dto: Partial<Tarea>) {
    const updated = await apiPut<Tarea>(`/api/tareas/${id}`, dto)
    setTareas(prev => prev.map(t => t.id === id ? updated : t))
    return updated
  }

  async function deleteTarea(id: string) {
    await apiDelete(`/api/tareas/${id}`)
    setTareas(prev => prev.filter(t => t.id !== id))
  }

  return { tareas, loading, error, createTarea, updateTarea, deleteTarea, refetch: fetchTareas }
}

// ─── Clientes (Proyectos) ─────────────────────────────────────────────────────

export function useClientesProyectos() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  const fetchClientes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiGet<Cliente[] | PagedResult<Cliente>>('/api/proyectos/clientes?size=200')
      setClientes(toArray(res))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando clientes')
      setClientes([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchClientes() }, [fetchClientes])

  return { clientes, loading, error, refetch: fetchClientes }
}
