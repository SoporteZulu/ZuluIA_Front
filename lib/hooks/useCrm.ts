import { useCallback, useEffect, useState } from "react"
import { apiDelete, apiFetch, apiGet, apiPost, apiPut } from "@/lib/api"
import type {
  CRMCampaign,
  CRMClient,
  CRMComunicado,
  CRMContact,
  CRMInteraction,
  CRMOpportunity,
  CRMRelacionContacto,
  CRMSeguimiento,
  CRMTask,
  CRMUser,
  CRMSegment,
  CrmCatalogDetailOption,
  CrmCatalogos,
  CrmReportes,
  CrmSegmentoMiembro,
  CrmSegmentoPreviewResult,
} from "@/lib/types"

type PagedResult<T> = { items: T[]; total: number; page: number; size: number }

type ReportFilters = {
  clienteId?: string
  responsableId?: string
  segmento?: string
  campanaId?: string
  desde?: Date | string
  hasta?: Date | string
}

type CatalogState<T> = {
  data: T
  loading: boolean
  error: string | null
}

const emptyCatalogos: CrmCatalogos = {
  tiposCliente: [],
  segmentosCliente: [],
  origenesCliente: [],
  estadosRelacion: [],
  canalesContacto: [],
  estadosContacto: [],
  etapasOportunidad: [],
  monedas: [],
  origenesOportunidad: [],
  tiposInteraccion: [],
  canalesInteraccion: [],
  resultadosInteraccion: [],
  tiposTarea: [],
  prioridadesTarea: [],
  estadosTarea: [],
  tiposCampana: [],
  objetivosCampana: [],
  tiposSegmento: [],
  rolesUsuario: [],
  estadosUsuario: [],
  tiposRelacion: [],
  clientes: [],
  contactos: [],
  usuarios: [],
  segmentos: [],
}

const emptyReportes: CrmReportes = {
  resumenComercial: {
    clientesActivos: 0,
    pipelineAbierto: 0,
    cierresVencidos: 0,
    seguimientoVencido: 0,
  },
  pipelinePorEtapa: [],
  distribucionProbabilidad: [],
  rankingVendedores: [],
  radarOportunidades: [],
  radarClientes: [],
  resumenMarketing: {
    campanasActivas: 0,
    desvioPresupuestario: 0,
    leads: 0,
    conversion: 0,
  },
  clientesPorSegmento: [],
  clientesPorIndustria: [],
  resultadosCampanas: [],
  radarCampanas: [],
  actividadPorUsuario: [],
  actividadReciente: [],
}

function toArray<T>(result: T[] | PagedResult<T>): T[] {
  return Array.isArray(result) ? result : result.items
}

function isDateOnly(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function parseDateOnly(value?: string | Date | null): Date | undefined {
  if (!value) return undefined
  if (value instanceof Date) return value
  if (isDateOnly(value)) {
    const [year, month, day] = value.split("-").map(Number)
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

function parseDateTime(value?: string | Date | null): Date | undefined {
  if (!value) return undefined
  if (value instanceof Date) return value

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

function serializeDateOnly(value?: string | Date | null): string | undefined {
  if (!value) return undefined
  if (typeof value === "string" && value.trim().length === 0) return undefined
  if (isDateOnly(value)) return `${value}T12:00:00.000Z`

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return undefined

  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0)
  ).toISOString()
}

function serializeDateTime(value?: string | Date | null): string | undefined {
  if (!value) return undefined
  if (typeof value === "string" && value.trim().length === 0) return undefined

  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

function serializeDateOnlyQuery(value?: string | Date | null): string | undefined {
  if (!value) return undefined
  if (typeof value === "string" && value.trim().length === 0) return undefined
  if (isDateOnly(value)) return value

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return undefined

  const year = date.getUTCFullYear()
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0")
  const day = `${date.getUTCDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

function normalizeString(value?: string | null): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function normalizeAvatarUrl(value?: string | null): string | undefined {
  const normalized = normalizeString(value)
  if (!normalized) return undefined
  if (normalized.startsWith("/")) return normalized
  if (normalized.includes("example.com")) return undefined
  return normalized
}

function normalizeEmail(value?: string | null): string {
  return normalizeString(value) ?? ""
}

function normalizeId(value?: string | number | null): string | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value === "number") return `${value}`
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function normalizeNumericId(value?: string | number | null): number | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value === "number" && Number.isFinite(value)) return value
  const normalized = normalizeString(value)
  if (!normalized) return undefined
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : undefined
}

function mapCliente(item: CRMClient): CRMClient {
  return {
    ...item,
    fechaAlta: parseDateOnly(item.fechaAlta) ?? new Date(),
    createdAt: parseDateTime(item.createdAt) ?? new Date(),
    updatedAt: parseDateTime(item.updatedAt) ?? parseDateTime(item.createdAt) ?? new Date(),
  }
}

function mapContacto(item: CRMContact): CRMContact {
  return {
    ...item,
    createdAt: parseDateTime(item.createdAt) ?? new Date(),
    updatedAt: parseDateTime(item.updatedAt) ?? parseDateTime(item.createdAt) ?? new Date(),
  }
}

function mapOportunidad(item: CRMOpportunity): CRMOpportunity {
  return {
    ...item,
    fechaApertura: parseDateOnly(item.fechaApertura) ?? new Date(),
    fechaEstimadaCierre: parseDateOnly(item.fechaEstimadaCierre),
    createdAt: parseDateTime(item.createdAt) ?? new Date(),
    updatedAt: parseDateTime(item.updatedAt) ?? parseDateTime(item.createdAt) ?? new Date(),
  }
}

function mapInteraccion(item: CRMInteraction): CRMInteraction {
  return {
    ...item,
    fechaHora: parseDateTime(item.fechaHora) ?? new Date(),
    createdAt: parseDateTime(item.createdAt) ?? new Date(),
    updatedAt: parseDateTime(item.updatedAt) ?? parseDateTime(item.createdAt) ?? new Date(),
  }
}

function mapTarea(item: CRMTask): CRMTask {
  return {
    ...item,
    fechaVencimiento: parseDateOnly(item.fechaVencimiento) ?? new Date(),
    fechaCompletado: parseDateOnly(item.fechaCompletado),
    createdAt: parseDateTime(item.createdAt) ?? new Date(),
    updatedAt: parseDateTime(item.updatedAt) ?? parseDateTime(item.createdAt) ?? new Date(),
  }
}

function mapCampana(item: CRMCampaign): CRMCampaign {
  return {
    ...item,
    fechaInicio: parseDateOnly(item.fechaInicio) ?? new Date(),
    fechaFin: parseDateOnly(item.fechaFin),
    createdAt: parseDateTime(item.createdAt) ?? new Date(),
    updatedAt: parseDateTime(item.updatedAt) ?? parseDateTime(item.createdAt) ?? new Date(),
  }
}

function mapSegmento(item: CRMSegment): CRMSegment {
  return {
    ...item,
    criterios: Array.isArray(item.criterios) ? item.criterios : [],
    createdAt: parseDateTime(item.createdAt) ?? new Date(),
    updatedAt: parseDateTime(item.updatedAt) ?? parseDateTime(item.createdAt) ?? new Date(),
  }
}

function mapUsuario(item: CRMUser): CRMUser {
  return {
    ...item,
    email: normalizeEmail(item.email),
    avatar: normalizeAvatarUrl(item.avatar),
    createdAt: parseDateTime(item.createdAt) ?? new Date(),
    updatedAt: parseDateTime(item.updatedAt) ?? parseDateTime(item.createdAt) ?? new Date(),
  }
}

function mapCatalogDetail(item: {
  id: string | number
  codigo: string
  descripcion: string
  activo: boolean
}): CrmCatalogDetailOption {
  return {
    id: `${item.id}`,
    codigo: item.codigo,
    descripcion: item.descripcion,
    activo: item.activo,
  }
}

function mapComunicado(item: {
  id: string | number
  sucursalId: number
  terceroId: string | number
  campanaId?: string | number | null
  tipoId?: string | number | null
  fecha: string | Date
  asunto: string
  contenido?: string | null
  usuarioId?: string | number | null
}): CRMComunicado {
  return {
    id: `${item.id}`,
    sucursalId: Number(item.sucursalId),
    terceroId: `${item.terceroId}`,
    campanaId: normalizeId(item.campanaId),
    tipoId: normalizeId(item.tipoId),
    fecha: parseDateOnly(item.fecha) ?? new Date(),
    asunto: item.asunto,
    contenido: normalizeString(item.contenido),
    usuarioId: normalizeId(item.usuarioId),
  }
}

function mapSeguimiento(item: {
  id: string | number
  sucursalId: number
  terceroId: string | number
  motivoId?: string | number | null
  interesId?: string | number | null
  campanaId?: string | number | null
  fecha: string | Date
  descripcion: string
  proximaAccion?: string | Date | null
  usuarioId?: string | number | null
}): CRMSeguimiento {
  return {
    id: `${item.id}`,
    sucursalId: Number(item.sucursalId),
    terceroId: `${item.terceroId}`,
    motivoId: normalizeId(item.motivoId),
    interesId: normalizeId(item.interesId),
    campanaId: normalizeId(item.campanaId),
    fecha: parseDateOnly(item.fecha) ?? new Date(),
    descripcion: item.descripcion,
    proximaAccion: parseDateOnly(item.proximaAccion),
    usuarioId: normalizeId(item.usuarioId),
  }
}

function mapRelacionContacto(item: {
  id: string | number
  personaId: string | number
  personaContactoId: string | number
  tipoRelacionId?: string | number | null
}): CRMRelacionContacto {
  return {
    id: `${item.id}`,
    personaId: `${item.personaId}`,
    personaContactoId: `${item.personaContactoId}`,
    tipoRelacionId: normalizeId(item.tipoRelacionId),
  }
}

function mapSegmentoMiembro(item: CrmSegmentoMiembro): CrmSegmentoMiembro {
  return {
    ...item,
    industria: normalizeString(item.industria),
    provincia: normalizeString(item.provincia),
    ciudad: normalizeString(item.ciudad),
  }
}

function mapReportes(item: CrmReportes): CrmReportes {
  return {
    ...item,
    radarOportunidades: item.radarOportunidades.map((entry) => ({
      ...entry,
      fechaEstimadaCierre: parseDateOnly(entry.fechaEstimadaCierre),
      ultimaGestion: parseDateTime(entry.ultimaGestion),
    })),
    radarClientes: item.radarClientes.map((entry) => ({
      ...entry,
      ultimaGestion: parseDateTime(entry.ultimaGestion),
    })),
    radarCampanas: item.radarCampanas.map((entry) => ({
      ...entry,
      fechaInicio: parseDateOnly(entry.fechaInicio) ?? new Date(),
      fechaFin: parseDateOnly(entry.fechaFin) ?? new Date(),
    })),
    actividadReciente: item.actividadReciente.map((entry) => ({
      ...entry,
      fechaHora: parseDateTime(entry.fechaHora) ?? new Date(),
    })),
  }
}

function clientePayload(data: Partial<CRMClient>) {
  return {
    nombre: data.nombre?.trim() ?? "",
    tipoCliente: data.tipoCliente,
    segmento: data.segmento,
    industria: normalizeString(data.industria),
    cuit: normalizeString(data.cuit),
    pais: data.pais?.trim() ?? "Argentina",
    provincia: normalizeString(data.provincia),
    ciudad: normalizeString(data.ciudad),
    direccion: normalizeString(data.direccion),
    telefonoPrincipal: normalizeString(data.telefonoPrincipal),
    emailPrincipal: normalizeString(data.emailPrincipal),
    sitioWeb: normalizeString(data.sitioWeb),
    origenCliente: data.origenCliente,
    estadoRelacion: data.estadoRelacion,
    responsableId: normalizeString(data.responsableId),
    fechaAlta: serializeDateOnly(data.fechaAlta),
    notasGenerales: normalizeString(data.notasGenerales),
  }
}

function contactoPayload(data: Partial<CRMContact>) {
  return {
    clienteId: normalizeString(data.clienteId) ?? "",
    nombre: data.nombre?.trim() ?? "",
    apellido: data.apellido?.trim() ?? "",
    cargo: normalizeString(data.cargo),
    email: normalizeString(data.email),
    telefono: normalizeString(data.telefono),
    canalPreferido: data.canalPreferido,
    estadoContacto: data.estadoContacto,
    notas: normalizeString(data.notas),
  }
}

function oportunidadPayload(data: Partial<CRMOpportunity>) {
  return {
    clienteId: normalizeString(data.clienteId) ?? "",
    contactoPrincipalId: normalizeString(data.contactoPrincipalId),
    titulo: data.titulo?.trim() ?? "",
    etapa: data.etapa,
    probabilidad: Number(data.probabilidad ?? 0),
    montoEstimado: Number(data.montoEstimado ?? 0),
    moneda: data.moneda,
    fechaApertura: serializeDateOnly(data.fechaApertura) ?? new Date().toISOString(),
    fechaEstimadaCierre: serializeDateOnly(data.fechaEstimadaCierre),
    responsableId: normalizeString(data.responsableId),
    origen: data.origen,
    motivoPerdida: normalizeString(data.motivoPerdida),
    notas: normalizeString(data.notas),
  }
}

function interaccionPayload(data: Partial<CRMInteraction>) {
  return {
    clienteId: normalizeString(data.clienteId) ?? "",
    contactoId: normalizeString(data.contactoId),
    oportunidadId: normalizeString(data.oportunidadId),
    tipoInteraccion: data.tipoInteraccion,
    canal: data.canal,
    fechaHora: serializeDateTime(data.fechaHora) ?? new Date().toISOString(),
    usuarioResponsableId: normalizeString(data.usuarioResponsableId) ?? "",
    resultado: data.resultado,
    descripcion: normalizeString(data.descripcion),
    adjuntos: data.adjuntos ?? [],
  }
}

function tareaPayload(data: Partial<CRMTask>) {
  return {
    clienteId: normalizeString(data.clienteId),
    oportunidadId: normalizeString(data.oportunidadId),
    asignadoAId: normalizeString(data.asignadoAId) ?? "",
    titulo: data.titulo?.trim() ?? "",
    descripcion: normalizeString(data.descripcion),
    tipoTarea: data.tipoTarea,
    fechaVencimiento: serializeDateOnly(data.fechaVencimiento) ?? new Date().toISOString(),
    prioridad: data.prioridad,
    estado: data.estado,
    fechaCompletado: serializeDateOnly(data.fechaCompletado),
  }
}

function campanaPayload(data: Partial<CRMCampaign>) {
  return {
    sucursalId: data.sucursalId,
    nombre: data.nombre?.trim() ?? "",
    tipoCampana: data.tipoCampana,
    objetivo: data.objetivo,
    segmentoObjetivoId: normalizeString(data.segmentoObjetivoId),
    fechaInicio: serializeDateOnly(data.fechaInicio) ?? new Date().toISOString(),
    fechaFin: serializeDateOnly(data.fechaFin ?? data.fechaInicio) ?? new Date().toISOString(),
    presupuestoEstimado: Number(data.presupuestoEstimado ?? 0),
    presupuestoGastado: Number(data.presupuestoGastado ?? 0),
    responsableId: normalizeString(data.responsableId),
    notas: normalizeString(data.notas),
    leadsGenerados: Number(data.leadsGenerados ?? 0),
    oportunidadesGeneradas: Number(data.oportunidadesGeneradas ?? 0),
    negociosGanados: Number(data.negociosGanados ?? 0),
  }
}

function segmentoPayload(data: Partial<CRMSegment>) {
  return {
    nombre: data.nombre?.trim() ?? "",
    descripcion: normalizeString(data.descripcion),
    criterios: data.criterios ?? [],
    tipoSegmento: data.tipoSegmento,
  }
}

function usuarioPayload(data: Partial<CRMUser>) {
  return {
    nombre: data.nombre?.trim() ?? "",
    apellido: data.apellido?.trim() ?? "",
    email: normalizeEmail(data.email),
    rol: data.rol,
    estado: data.estado,
    avatar: normalizeString(data.avatar),
  }
}

function comunicadoPayload(data: Partial<CRMComunicado>) {
  return {
    sucursalId: data.sucursalId,
    terceroId: normalizeNumericId(data.terceroId),
    campanaId: normalizeNumericId(data.campanaId),
    tipoId: normalizeNumericId(data.tipoId),
    fecha: serializeDateOnlyQuery(data.fecha) ?? serializeDateOnlyQuery(new Date()),
    asunto: data.asunto?.trim() ?? "",
    contenido: normalizeString(data.contenido),
    usuarioId: normalizeNumericId(data.usuarioId),
  }
}

function seguimientoPayload(data: Partial<CRMSeguimiento>) {
  return {
    sucursalId: data.sucursalId,
    terceroId: normalizeNumericId(data.terceroId),
    motivoId: normalizeNumericId(data.motivoId),
    interesId: normalizeNumericId(data.interesId),
    campanaId: normalizeNumericId(data.campanaId),
    fecha: serializeDateOnlyQuery(data.fecha) ?? serializeDateOnlyQuery(new Date()),
    descripcion: data.descripcion?.trim() ?? "",
    proximaAccion: serializeDateOnlyQuery(data.proximaAccion),
    usuarioId: normalizeNumericId(data.usuarioId),
  }
}

function buildQuery(params: Record<string, string | undefined>) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value && value !== "all") search.set(key, value)
  })
  const query = search.toString()
  return query.length > 0 ? `?${query}` : ""
}

function useCollectionState<T>(initial: T[]) {
  const [items, setItems] = useState<T[]>(initial)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  return { items, setItems, loading, setLoading, error, setError }
}

export function useCrmCatalogos() {
  const [state, setState] = useState<CatalogState<CrmCatalogos>>({
    data: emptyCatalogos,
    loading: true,
    error: null,
  })

  const fetchCatalogos = useCallback(async () => {
    try {
      setState((current) => ({ ...current, loading: true, error: null }))
      const response = await apiGet<CrmCatalogos>("/api/crm/catalogos")
      setState({ data: response, loading: false, error: null })
    } catch (error) {
      setState({
        data: emptyCatalogos,
        loading: false,
        error: error instanceof Error ? error.message : "Error cargando catálogos CRM",
      })
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadCatalogos = async () => {
      try {
        const response = await apiGet<CrmCatalogos>("/api/crm/catalogos")
        if (cancelled) return
        setState({ data: response, loading: false, error: null })
      } catch (error) {
        if (cancelled) return
        setState({
          data: emptyCatalogos,
          loading: false,
          error: error instanceof Error ? error.message : "Error cargando catálogos CRM",
        })
      }
    }

    void loadCatalogos()

    return () => {
      cancelled = true
    }
  }, [])

  return {
    ...state,
    refetch: fetchCatalogos,
  }
}

export function useCrmClientes() {
  const { items, setItems, loading, setLoading, error, setError } = useCollectionState<CRMClient>(
    []
  )
  const [search, setSearch] = useState("")

  const fetchClientes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const query = buildQuery({ busqueda: normalizeString(search) })
      const response = await apiGet<CRMClient[] | PagedResult<CRMClient>>(
        `/api/crm/clientes${query}`
      )
      setItems(toArray(response).map(mapCliente))
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error cargando clientes CRM")
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [search, setError, setItems, setLoading])

  useEffect(() => {
    void fetchClientes()
  }, [fetchClientes])

  async function createCliente(dto: Omit<CRMClient, "id" | "createdAt" | "updatedAt">) {
    const created = mapCliente(await apiPost<CRMClient>("/api/crm/clientes", clientePayload(dto)))
    setItems((current) => [created, ...current])
    return created
  }

  async function updateCliente(id: string, dto: Partial<CRMClient>) {
    const updated = mapCliente(
      await apiPut<CRMClient>(`/api/crm/clientes/${id}`, clientePayload(dto))
    )
    setItems((current) => current.map((item) => (item.id === id ? updated : item)))
    return updated
  }

  async function deleteCliente(id: string) {
    await apiDelete(`/api/crm/clientes/${id}`)
    setItems((current) => current.filter((item) => item.id !== id))
  }

  return {
    clientes: items,
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

export function useCrmContactos(clienteId?: string) {
  const { items, setItems, loading, setLoading, error, setError } = useCollectionState<CRMContact>(
    []
  )

  const fetchContactos = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const query = buildQuery({ clienteId: normalizeString(clienteId) })
      const response = await apiGet<CRMContact[] | PagedResult<CRMContact>>(
        `/api/crm/contactos${query}`
      )
      setItems(toArray(response).map(mapContacto))
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error cargando contactos")
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [clienteId, setError, setItems, setLoading])

  useEffect(() => {
    void fetchContactos()
  }, [fetchContactos])

  async function createContacto(dto: Omit<CRMContact, "id" | "createdAt" | "updatedAt">) {
    const created = mapContacto(
      await apiPost<CRMContact>("/api/crm/contactos", contactoPayload(dto))
    )
    setItems((current) => [created, ...current])
    return created
  }

  async function updateContacto(id: string, dto: Partial<CRMContact>) {
    const updated = mapContacto(
      await apiPut<CRMContact>(`/api/crm/contactos/${id}`, contactoPayload(dto))
    )
    setItems((current) => current.map((item) => (item.id === id ? updated : item)))
    return updated
  }

  async function deleteContacto(id: string) {
    await apiDelete(`/api/crm/contactos/${id}`)
    setItems((current) => current.filter((item) => item.id !== id))
  }

  return {
    contactos: items,
    loading,
    error,
    createContacto,
    updateContacto,
    deleteContacto,
    refetch: fetchContactos,
  }
}

export function useCrmOportunidades(clienteId?: string) {
  const { items, setItems, loading, setLoading, error, setError } =
    useCollectionState<CRMOpportunity>([])

  const fetchOportunidades = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const query = buildQuery({ clienteId: normalizeString(clienteId) })
      const response = await apiGet<CRMOpportunity[] | PagedResult<CRMOpportunity>>(
        `/api/crm/oportunidades${query}`
      )
      setItems(toArray(response).map(mapOportunidad))
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error cargando oportunidades")
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [clienteId, setError, setItems, setLoading])

  useEffect(() => {
    void fetchOportunidades()
  }, [fetchOportunidades])

  async function createOportunidad(dto: Omit<CRMOpportunity, "id" | "createdAt" | "updatedAt">) {
    const created = mapOportunidad(
      await apiPost<CRMOpportunity>("/api/crm/oportunidades", oportunidadPayload(dto))
    )
    setItems((current) => [created, ...current])
    return created
  }

  async function updateOportunidad(id: string, dto: Partial<CRMOpportunity>) {
    const updated = mapOportunidad(
      await apiPut<CRMOpportunity>(`/api/crm/oportunidades/${id}`, oportunidadPayload(dto))
    )
    setItems((current) => current.map((item) => (item.id === id ? updated : item)))
    return updated
  }

  async function closeOportunidadGanada(id: string) {
    const updated = mapOportunidad(
      await apiFetch<CRMOpportunity>(`/api/crm/oportunidades/${id}/cerrar-ganada`, {
        method: "PATCH",
      })
    )
    setItems((current) => current.map((item) => (item.id === id ? updated : item)))
    return updated
  }

  async function closeOportunidadPerdida(id: string, motivoPerdida: string) {
    const updated = mapOportunidad(
      await apiFetch<CRMOpportunity>(`/api/crm/oportunidades/${id}/cerrar-perdida`, {
        method: "PATCH",
        body: JSON.stringify({ motivoPerdida }),
      })
    )
    setItems((current) => current.map((item) => (item.id === id ? updated : item)))
    return updated
  }

  async function reassignOportunidad(id: string, responsableId: string) {
    const updated = mapOportunidad(
      await apiFetch<CRMOpportunity>(`/api/crm/oportunidades/${id}/reasignar`, {
        method: "PATCH",
        body: JSON.stringify({ responsableId }),
      })
    )
    setItems((current) => current.map((item) => (item.id === id ? updated : item)))
    return updated
  }

  async function deleteOportunidad(id: string) {
    await apiDelete(`/api/crm/oportunidades/${id}`)
    setItems((current) => current.filter((item) => item.id !== id))
  }

  return {
    oportunidades: items,
    loading,
    error,
    createOportunidad,
    updateOportunidad,
    closeOportunidadGanada,
    closeOportunidadPerdida,
    reassignOportunidad,
    deleteOportunidad,
    refetch: fetchOportunidades,
  }
}

export function useCrmInteracciones(clienteId?: string) {
  const { items, setItems, loading, setLoading, error, setError } =
    useCollectionState<CRMInteraction>([])

  const fetchInteracciones = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const query = buildQuery({ clienteId: normalizeString(clienteId) })
      const response = await apiGet<CRMInteraction[] | PagedResult<CRMInteraction>>(
        `/api/crm/interacciones${query}`
      )
      setItems(toArray(response).map(mapInteraccion))
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error cargando interacciones")
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [clienteId, setError, setItems, setLoading])

  useEffect(() => {
    void fetchInteracciones()
  }, [fetchInteracciones])

  async function createInteraccion(dto: Omit<CRMInteraction, "id" | "createdAt" | "updatedAt">) {
    const created = mapInteraccion(
      await apiPost<CRMInteraction>("/api/crm/interacciones", interaccionPayload(dto))
    )
    setItems((current) => [created, ...current])
    return created
  }

  async function updateInteraccion(id: string, dto: Partial<CRMInteraction>) {
    const updated = mapInteraccion(
      await apiPut<CRMInteraction>(`/api/crm/interacciones/${id}`, interaccionPayload(dto))
    )
    setItems((current) => current.map((item) => (item.id === id ? updated : item)))
    return updated
  }

  async function deleteInteraccion(id: string) {
    await apiDelete(`/api/crm/interacciones/${id}`)
    setItems((current) => current.filter((item) => item.id !== id))
  }

  return {
    interacciones: items,
    loading,
    error,
    createInteraccion,
    updateInteraccion,
    deleteInteraccion,
    refetch: fetchInteracciones,
  }
}

export function useCrmTareas(clienteId?: string) {
  const { items, setItems, loading, setLoading, error, setError } = useCollectionState<CRMTask>([])

  const fetchTareas = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const query = buildQuery({ clienteId: normalizeString(clienteId) })
      const response = await apiGet<CRMTask[] | PagedResult<CRMTask>>(`/api/crm/tareas${query}`)
      setItems(toArray(response).map(mapTarea))
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error cargando tareas")
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [clienteId, setError, setItems, setLoading])

  useEffect(() => {
    void fetchTareas()
  }, [fetchTareas])

  async function createTarea(dto: Omit<CRMTask, "id" | "createdAt" | "updatedAt">) {
    const created = mapTarea(await apiPost<CRMTask>("/api/crm/tareas", tareaPayload(dto)))
    setItems((current) => [created, ...current])
    return created
  }

  async function updateTarea(id: string, dto: Partial<CRMTask>) {
    const updated = mapTarea(await apiPut<CRMTask>(`/api/crm/tareas/${id}`, tareaPayload(dto)))
    setItems((current) => current.map((item) => (item.id === id ? updated : item)))
    return updated
  }

  async function completeTarea(id: string, fechaCompletado?: Date) {
    const updated = mapTarea(
      await apiFetch<CRMTask>(`/api/crm/tareas/${id}/completar`, {
        method: "PATCH",
        body: JSON.stringify({ fechaCompletado: serializeDateTime(fechaCompletado) }),
      })
    )
    setItems((current) => current.map((item) => (item.id === id ? updated : item)))
    return updated
  }

  async function reopenTarea(id: string) {
    const updated = mapTarea(
      await apiFetch<CRMTask>(`/api/crm/tareas/${id}/reabrir`, { method: "PATCH" })
    )
    setItems((current) => current.map((item) => (item.id === id ? updated : item)))
    return updated
  }

  async function deleteTarea(id: string) {
    await apiDelete(`/api/crm/tareas/${id}`)
    setItems((current) => current.filter((item) => item.id !== id))
  }

  return {
    tareas: items,
    loading,
    error,
    createTarea,
    updateTarea,
    completeTarea,
    reopenTarea,
    deleteTarea,
    refetch: fetchTareas,
  }
}

export function useCrmCampanas() {
  const { items, setItems, loading, setLoading, error, setError } = useCollectionState<CRMCampaign>(
    []
  )

  const fetchCampanas = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiGet<CRMCampaign[] | PagedResult<CRMCampaign>>("/api/crm/campanas")
      setItems(toArray(response).map(mapCampana))
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error cargando campañas")
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [setError, setItems, setLoading])

  useEffect(() => {
    void fetchCampanas()
  }, [fetchCampanas])

  async function createCampana(dto: Omit<CRMCampaign, "id" | "createdAt" | "updatedAt">) {
    const created = mapCampana(await apiPost<CRMCampaign>("/api/crm/campanas", campanaPayload(dto)))
    setItems((current) => [created, ...current])
    return created
  }

  async function updateCampana(id: string, dto: Partial<CRMCampaign>) {
    const updated = mapCampana(
      await apiPut<CRMCampaign>(`/api/crm/campanas/${id}`, campanaPayload(dto))
    )
    setItems((current) => current.map((item) => (item.id === id ? updated : item)))
    return updated
  }

  async function closeCampana(id: string) {
    await apiFetch(`/api/crm/campanas/${id}/cerrar`, { method: "PATCH" })
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              activa: false,
              fechaFin: new Date(),
            }
          : item
      )
    )
  }

  async function deleteCampana(id: string) {
    await apiDelete(`/api/crm/campanas/${id}`)
    setItems((current) => current.filter((item) => item.id !== id))
  }

  return {
    campanas: items,
    loading,
    error,
    createCampana,
    updateCampana,
    closeCampana,
    deleteCampana,
    refetch: fetchCampanas,
  }
}

export function useCrmSegmentos() {
  const { items, setItems, loading, setLoading, error, setError } = useCollectionState<CRMSegment>(
    []
  )

  const fetchSegmentos = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiGet<CRMSegment[] | PagedResult<CRMSegment>>("/api/crm/segmentos")
      setItems(toArray(response).map(mapSegmento))
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error cargando segmentos")
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [setError, setItems, setLoading])

  useEffect(() => {
    void fetchSegmentos()
  }, [fetchSegmentos])

  const createSegmento = useCallback(
    async (dto: Omit<CRMSegment, "id" | "createdAt" | "updatedAt">) => {
      const created = mapSegmento(
        await apiPost<CRMSegment>("/api/crm/segmentos", segmentoPayload(dto))
      )
      setItems((current) => [created, ...current])
      return created
    },
    [setItems]
  )

  const updateSegmento = useCallback(
    async (id: string, dto: Partial<CRMSegment>) => {
      const updated = mapSegmento(
        await apiPut<CRMSegment>(`/api/crm/segmentos/${id}`, segmentoPayload(dto))
      )
      setItems((current) => current.map((item) => (item.id === id ? updated : item)))
      return updated
    },
    [setItems]
  )

  const deleteSegmento = useCallback(
    async (id: string) => {
      await apiDelete(`/api/crm/segmentos/${id}`)
      setItems((current) => current.filter((item) => item.id !== id))
    },
    [setItems]
  )

  const getMiembros = useCallback(async (id: string) => {
    const response = await apiGet<CrmSegmentoMiembro[]>(`/api/crm/segmentos/${id}/miembros`)
    return response.map(mapSegmentoMiembro)
  }, [])

  const addMiembro = useCallback(
    async (id: string, clienteId: string) => {
      const response = await apiPost<CrmSegmentoMiembro[]>(`/api/crm/segmentos/${id}/miembros`, {
        clienteId,
      })
      await fetchSegmentos()
      return response.map(mapSegmentoMiembro)
    },
    [fetchSegmentos]
  )

  const removeMiembro = useCallback(
    async (id: string, clienteId: string) => {
      await apiDelete(`/api/crm/segmentos/${id}/miembros/${clienteId}`)
      await fetchSegmentos()
    },
    [fetchSegmentos]
  )

  const previewSegmento = useCallback(
    async (criterios: CRMSegment["criterios"], tipoSegmento: CRMSegment["tipoSegmento"]) => {
      const response = await apiPost<CrmSegmentoPreviewResult>("/api/crm/segmentos/preview", {
        criterios,
        tipoSegmento,
      })

      return {
        cantidadClientes: response.cantidadClientes,
        clientes: response.clientes.map(mapSegmentoMiembro),
      }
    },
    []
  )

  return {
    segmentos: items,
    loading,
    error,
    createSegmento,
    updateSegmento,
    deleteSegmento,
    getMiembros,
    addMiembro,
    removeMiembro,
    previewSegmento,
    refetch: fetchSegmentos,
  }
}

export function useCrmUsuarios() {
  const { items, setItems, loading, setLoading, error, setError } = useCollectionState<CRMUser>([])

  const fetchUsuarios = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiGet<CRMUser[] | PagedResult<CRMUser>>("/api/crm/usuarios")
      setItems(toArray(response).map(mapUsuario))
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error cargando usuarios CRM")
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [setError, setItems, setLoading])

  useEffect(() => {
    void fetchUsuarios()
  }, [fetchUsuarios])

  async function createUsuario(dto: Omit<CRMUser, "id" | "createdAt" | "updatedAt">) {
    const created = mapUsuario(await apiPost<CRMUser>("/api/crm/usuarios", usuarioPayload(dto)))
    await fetchUsuarios()
    return created
  }

  async function updateUsuario(id: string, dto: Partial<CRMUser>) {
    const updated = mapUsuario(
      await apiPut<CRMUser>(`/api/crm/usuarios/${id}`, usuarioPayload(dto))
    )
    await fetchUsuarios()
    return updated
  }

  async function deleteUsuario(id: string) {
    await apiDelete(`/api/crm/usuarios/${id}`)
    await fetchUsuarios()
  }

  return {
    usuarios: items,
    loading,
    error,
    createUsuario,
    updateUsuario,
    deleteUsuario,
    refetch: fetchUsuarios,
  }
}

export function useCrmRelacionesContacto(personaId?: string) {
  const { items, setItems, loading, setLoading, error, setError } =
    useCollectionState<CRMRelacionContacto>([])

  const fetchRelaciones = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const query = buildQuery({ personaId: normalizeString(personaId) })
      const response = await apiGet<
        Array<{
          id: string | number
          personaId: string | number
          personaContactoId: string | number
          tipoRelacionId?: string | number | null
        }>
      >(`/api/crm/relaciones-contacto${query}`)
      setItems(response.map(mapRelacionContacto))
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error cargando relaciones de contacto")
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [personaId, setError, setItems, setLoading])

  useEffect(() => {
    void fetchRelaciones()
  }, [fetchRelaciones])

  async function createRelacion(dto: Omit<CRMRelacionContacto, "id">) {
    await apiPost("/api/crm/relaciones-contacto", {
      personaId: normalizeNumericId(dto.personaId),
      personaContactoId: normalizeNumericId(dto.personaContactoId),
      tipoRelacionId: normalizeNumericId(dto.tipoRelacionId),
    })
    await fetchRelaciones()
  }

  async function updateRelacion(id: string, dto: Pick<CRMRelacionContacto, "tipoRelacionId">) {
    await apiPut(`/api/crm/relaciones-contacto/${id}`, {
      tipoRelacionId: normalizeNumericId(dto.tipoRelacionId),
    })
    await fetchRelaciones()
  }

  async function deleteRelacion(id: string) {
    await apiDelete(`/api/crm/relaciones-contacto/${id}`)
    setItems((current) => current.filter((item) => item.id !== id))
  }

  return {
    relacionesContacto: items,
    loading,
    error,
    createRelacion,
    updateRelacion,
    deleteRelacion,
    refetch: fetchRelaciones,
  }
}

export function useCrmTiposRelacion(activo?: boolean) {
  const { items, setItems, loading, setLoading, error, setError } =
    useCollectionState<CrmCatalogDetailOption>([])

  const fetchTiposRelacion = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const query = buildQuery({
        activo: typeof activo === "boolean" ? `${activo}` : undefined,
      })
      const response = await apiGet<
        Array<{ id: string | number; codigo: string; descripcion: string; activo: boolean }>
      >(`/api/crm/tipos-relacion${query}`)
      setItems(response.map(mapCatalogDetail))
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error cargando tipos de relación")
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [activo, setError, setItems, setLoading])

  useEffect(() => {
    void fetchTiposRelacion()
  }, [fetchTiposRelacion])

  return {
    tiposRelacion: items,
    loading,
    error,
    refetch: fetchTiposRelacion,
  }
}

export function useCrmTiposComunicado(activo?: boolean) {
  const { items, setItems, loading, setLoading, error, setError } =
    useCollectionState<CrmCatalogDetailOption>([])

  const fetchTipos = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const query = buildQuery({
        activo: typeof activo === "boolean" ? `${activo}` : undefined,
      })
      const response = await apiGet<
        Array<{ id: string | number; codigo: string; descripcion: string; activo: boolean }>
      >(`/api/crm/tipos-comunicado${query}`)
      setItems(response.map(mapCatalogDetail))
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error cargando tipos de comunicado")
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [activo, setError, setItems, setLoading])

  useEffect(() => {
    void fetchTipos()
  }, [fetchTipos])

  return {
    tiposComunicado: items,
    loading,
    error,
    createTipoComunicado: async (codigo: string, descripcion: string) => {
      await apiPost("/api/crm/tipos-comunicado", { codigo, descripcion })
      await fetchTipos()
    },
    updateTipoComunicado: async (id: string, descripcion: string) => {
      await apiPut(`/api/crm/tipos-comunicado/${id}`, { descripcion })
      await fetchTipos()
    },
    activateTipoComunicado: async (id: string) => {
      await apiFetch(`/api/crm/tipos-comunicado/${id}/activar`, { method: "PATCH" })
      await fetchTipos()
    },
    deactivateTipoComunicado: async (id: string) => {
      await apiFetch(`/api/crm/tipos-comunicado/${id}/desactivar`, { method: "PATCH" })
      await fetchTipos()
    },
    refetch: fetchTipos,
  }
}

export function useCrmMotivos(activo?: boolean) {
  const { items, setItems, loading, setLoading, error, setError } =
    useCollectionState<CrmCatalogDetailOption>([])

  const fetchMotivos = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const query = buildQuery({
        activo: typeof activo === "boolean" ? `${activo}` : undefined,
      })
      const response = await apiGet<
        Array<{ id: string | number; codigo: string; descripcion: string; activo: boolean }>
      >(`/api/crm/motivos${query}`)
      setItems(response.map(mapCatalogDetail))
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error cargando motivos CRM")
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [activo, setError, setItems, setLoading])

  useEffect(() => {
    void fetchMotivos()
  }, [fetchMotivos])

  return {
    motivos: items,
    loading,
    error,
    createMotivo: async (codigo: string, descripcion: string) => {
      await apiPost("/api/crm/motivos", { codigo, descripcion })
      await fetchMotivos()
    },
    updateMotivo: async (id: string, descripcion: string) => {
      await apiPut(`/api/crm/motivos/${id}`, { descripcion })
      await fetchMotivos()
    },
    activateMotivo: async (id: string) => {
      await apiFetch(`/api/crm/motivos/${id}/activar`, { method: "PATCH" })
      await fetchMotivos()
    },
    deactivateMotivo: async (id: string) => {
      await apiFetch(`/api/crm/motivos/${id}/desactivar`, { method: "PATCH" })
      await fetchMotivos()
    },
    refetch: fetchMotivos,
  }
}

export function useCrmIntereses(activo?: boolean) {
  const { items, setItems, loading, setLoading, error, setError } =
    useCollectionState<CrmCatalogDetailOption>([])

  const fetchIntereses = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const query = buildQuery({
        activo: typeof activo === "boolean" ? `${activo}` : undefined,
      })
      const response = await apiGet<
        Array<{ id: string | number; codigo: string; descripcion: string; activo: boolean }>
      >(`/api/crm/intereses${query}`)
      setItems(response.map(mapCatalogDetail))
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error cargando intereses CRM")
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [activo, setError, setItems, setLoading])

  useEffect(() => {
    void fetchIntereses()
  }, [fetchIntereses])

  return {
    intereses: items,
    loading,
    error,
    createInteres: async (codigo: string, descripcion: string) => {
      await apiPost("/api/crm/intereses", { codigo, descripcion })
      await fetchIntereses()
    },
    updateInteres: async (id: string, descripcion: string) => {
      await apiPut(`/api/crm/intereses/${id}`, { descripcion })
      await fetchIntereses()
    },
    activateInteres: async (id: string) => {
      await apiFetch(`/api/crm/intereses/${id}/activar`, { method: "PATCH" })
      await fetchIntereses()
    },
    deactivateInteres: async (id: string) => {
      await apiFetch(`/api/crm/intereses/${id}/desactivar`, { method: "PATCH" })
      await fetchIntereses()
    },
    refetch: fetchIntereses,
  }
}

export function useCrmComunicados(sucursalId?: number, terceroId?: string, campanaId?: string) {
  const { items, setItems, loading, setLoading, error, setError } =
    useCollectionState<CRMComunicado>([])

  const fetchComunicados = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const query = buildQuery({
        sucursalId: sucursalId ? `${sucursalId}` : undefined,
        terceroId: normalizeString(terceroId),
        campanaId: normalizeString(campanaId),
      })
      const response = await apiGet<
        Array<{
          id: string | number
          sucursalId: number
          terceroId: string | number
          campanaId?: string | number | null
          tipoId?: string | number | null
          fecha: string | Date
          asunto: string
          contenido?: string | null
          usuarioId?: string | number | null
        }>
      >(`/api/crm/comunicados${query}`)
      setItems(response.map(mapComunicado))
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error cargando comunicados CRM")
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [campanaId, setError, setItems, setLoading, sucursalId, terceroId])

  useEffect(() => {
    void fetchComunicados()
  }, [fetchComunicados])

  async function createComunicado(dto: Omit<CRMComunicado, "id">) {
    await apiPost("/api/crm/comunicados", comunicadoPayload(dto))
    await fetchComunicados()
  }

  async function updateComunicado(id: string, dto: Pick<CRMComunicado, "asunto" | "contenido">) {
    await apiPut(`/api/crm/comunicados/${id}`, {
      asunto: dto.asunto.trim(),
      contenido: normalizeString(dto.contenido),
    })
    await fetchComunicados()
  }

  async function deleteComunicado(id: string) {
    await apiDelete(`/api/crm/comunicados/${id}`)
    setItems((current) => current.filter((item) => item.id !== id))
  }

  return {
    comunicados: items,
    loading,
    error,
    createComunicado,
    updateComunicado,
    deleteComunicado,
    refetch: fetchComunicados,
  }
}

export function useCrmSeguimientos(sucursalId?: number, terceroId?: string, campanaId?: string) {
  const { items, setItems, loading, setLoading, error, setError } =
    useCollectionState<CRMSeguimiento>([])

  const fetchSeguimientos = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const query = buildQuery({
        sucursalId: sucursalId ? `${sucursalId}` : undefined,
        terceroId: normalizeString(terceroId),
        campanaId: normalizeString(campanaId),
      })
      const response = await apiGet<
        Array<{
          id: string | number
          sucursalId: number
          terceroId: string | number
          motivoId?: string | number | null
          interesId?: string | number | null
          campanaId?: string | number | null
          fecha: string | Date
          descripcion: string
          proximaAccion?: string | Date | null
          usuarioId?: string | number | null
        }>
      >(`/api/crm/seguimientos${query}`)
      setItems(response.map(mapSeguimiento))
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error cargando seguimientos CRM")
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [campanaId, setError, setItems, setLoading, sucursalId, terceroId])

  useEffect(() => {
    void fetchSeguimientos()
  }, [fetchSeguimientos])

  async function createSeguimiento(dto: Omit<CRMSeguimiento, "id">) {
    await apiPost("/api/crm/seguimientos", seguimientoPayload(dto))
    await fetchSeguimientos()
  }

  async function updateSeguimiento(
    id: string,
    dto: Pick<CRMSeguimiento, "descripcion" | "proximaAccion">
  ) {
    await apiPut(`/api/crm/seguimientos/${id}`, {
      descripcion: dto.descripcion.trim(),
      proximaAccion: serializeDateOnlyQuery(dto.proximaAccion),
    })
    await fetchSeguimientos()
  }

  async function deleteSeguimiento(id: string) {
    await apiDelete(`/api/crm/seguimientos/${id}`)
    setItems((current) => current.filter((item) => item.id !== id))
  }

  return {
    seguimientos: items,
    loading,
    error,
    createSeguimiento,
    updateSeguimiento,
    deleteSeguimiento,
    refetch: fetchSeguimientos,
  }
}

export function useCrmReportes(filters?: ReportFilters) {
  const [data, setData] = useState<CrmReportes>(emptyReportes)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReportes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const query = buildQuery({
        clienteId: normalizeString(filters?.clienteId),
        responsableId: normalizeString(filters?.responsableId),
        segmento: normalizeString(filters?.segmento),
        campanaId: normalizeString(filters?.campanaId),
        desde: serializeDateOnlyQuery(filters?.desde),
        hasta: serializeDateOnlyQuery(filters?.hasta),
      })
      const response = await apiGet<CrmReportes>(`/api/crm/reportes${query}`)
      setData(mapReportes(response))
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error cargando reportes CRM")
      setData(emptyReportes)
    } finally {
      setLoading(false)
    }
  }, [
    filters?.campanaId,
    filters?.clienteId,
    filters?.desde,
    filters?.hasta,
    filters?.responsableId,
    filters?.segmento,
  ])

  useEffect(() => {
    void fetchReportes()
  }, [fetchReportes])

  return {
    reportes: data,
    loading,
    error,
    refetch: fetchReportes,
  }
}
