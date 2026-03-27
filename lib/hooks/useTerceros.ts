"use client"

import { useState, useEffect, useCallback } from "react"
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api"
import type {
  Tercero,
  CreateTerceroDto,
  UpdateTerceroDto,
  CondicionIva,
  TerceroPerfilComercial,
  TerceroContacto,
  TerceroSucursalEntrega,
  TerceroTransporte,
  TerceroVentanaCobranza,
} from "@/lib/types/terceros"
import type { PagedResult } from "@/lib/types/items"
import type { Moneda } from "@/lib/types/items"
import type { TipoDocumento } from "@/lib/types/configuracion"

interface UseTercerosOptions {
  soloActivos?: boolean
}

export function useTerceros(options: UseTercerosOptions = {}) {
  const [terceros, setTerceros] = useState<Tercero[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")

  const fetchTerceros = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        soloClientes: "true",
        page: String(page),
        pageSize: "50",
        search,
      })

      if (options.soloActivos ?? true) {
        params.set("soloActivos", "true")
      }

      const result = await apiGet<PagedResult<Tercero>>(`/api/terceros?${params.toString()}`)
      setTerceros(result.items)
      setTotalCount(result.totalCount)
      setTotalPages(result.totalPages)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar clientes")
    } finally {
      setLoading(false)
    }
  }, [options.soloActivos, page, search])

  useEffect(() => {
    fetchTerceros()
  }, [fetchTerceros])

  const updateSearch = useCallback((value: string) => {
    setPage(1)
    setSearch(value)
  }, [])

  const createTercero = async (dto: CreateTerceroDto): Promise<boolean> => {
    try {
      await apiPost<Tercero>("/api/terceros", dto)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear cliente")
      return false
    }
  }

  const updateTercero = async (id: number, dto: UpdateTerceroDto): Promise<boolean> => {
    try {
      await apiPut<Tercero>(`/api/terceros/${id}`, dto)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al actualizar cliente")
      return false
    }
  }

  const deleteTercero = async (id: number): Promise<boolean> => {
    try {
      await apiDelete(`/api/terceros/${id}`)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al desactivar cliente")
      return false
    }
  }

  const getTerceroById = useCallback(async (id: number) => {
    return apiGet<Tercero>(`/api/terceros/${id}`)
  }, [])

  const getPerfilComercial = useCallback(async (id: number) => {
    return apiGet<TerceroPerfilComercial>(`/api/terceros/${id}/perfil-comercial`)
  }, [])

  const updatePerfilComercial = useCallback(
    async (id: number, dto: TerceroPerfilComercial): Promise<boolean> => {
      try {
        await apiPut<TerceroPerfilComercial>(`/api/terceros/${id}/perfil-comercial`, dto)
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al actualizar perfil comercial")
        return false
      }
    },
    []
  )

  const getContactos = useCallback(async (id: number) => {
    return apiGet<TerceroContacto[]>(`/api/terceros/${id}/contactos`)
  }, [])

  const updateContactos = useCallback(async (id: number, dto: TerceroContacto[]) => {
    try {
      await apiPut<TerceroContacto[]>(`/api/terceros/${id}/contactos`, dto)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al actualizar contactos")
      return false
    }
  }, [])

  const getSucursalesEntrega = useCallback(async (id: number) => {
    return apiGet<TerceroSucursalEntrega[]>(`/api/terceros/${id}/sucursales-entrega`)
  }, [])

  const updateSucursalesEntrega = useCallback(async (id: number, dto: TerceroSucursalEntrega[]) => {
    try {
      await apiPut<TerceroSucursalEntrega[]>(`/api/terceros/${id}/sucursales-entrega`, dto)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al actualizar sucursales de entrega")
      return false
    }
  }, [])

  const getTransportes = useCallback(async (id: number) => {
    return apiGet<TerceroTransporte[]>(`/api/terceros/${id}/transportes`)
  }, [])

  const updateTransportes = useCallback(async (id: number, dto: TerceroTransporte[]) => {
    try {
      await apiPut<TerceroTransporte[]>(`/api/terceros/${id}/transportes`, dto)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al actualizar transportes")
      return false
    }
  }, [])

  const getVentanasCobranza = useCallback(async (id: number) => {
    return apiGet<TerceroVentanaCobranza[]>(`/api/terceros/${id}/ventanas-cobranza`)
  }, [])

  const updateVentanasCobranza = useCallback(async (id: number, dto: TerceroVentanaCobranza[]) => {
    try {
      await apiPut<TerceroVentanaCobranza[]>(`/api/terceros/${id}/ventanas-cobranza`, dto)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al actualizar ventanas de cobranza")
      return false
    }
  }, [])

  return {
    terceros,
    loading,
    error,
    totalCount,
    totalPages,
    page,
    setPage,
    search,
    setSearch: updateSearch,
    createTercero,
    updateTercero,
    deleteTercero,
    getTerceroById,
    getPerfilComercial,
    updatePerfilComercial,
    getContactos,
    updateContactos,
    getSucursalesEntrega,
    updateSucursalesEntrega,
    getTransportes,
    updateTransportes,
    getVentanasCobranza,
    updateVentanasCobranza,
    refetch: fetchTerceros,
  }
}

export function useTercerosConfig() {
  const [condicionesIva, setCondicionesIva] = useState<CondicionIva[]>([])
  const [monedas, setMonedas] = useState<Moneda[]>([])
  const [tiposDocumento, setTiposDocumento] = useState<TipoDocumento[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      apiGet<CondicionIva[] | PagedResult<CondicionIva>>("/api/configuracion/condiciones-iva"),
      apiGet<Moneda[] | PagedResult<Moneda>>("/api/configuracion/monedas"),
      apiGet<TipoDocumento[] | PagedResult<TipoDocumento>>("/api/configuracion/tipos-documento"),
    ])
      .then(([conds, mons, docs]) => {
        const toArray = <T>(r: T[] | PagedResult<T>): T[] => (Array.isArray(r) ? r : r.items)

        setCondicionesIva(toArray(conds))
        setMonedas(toArray(mons))
        setTiposDocumento(toArray(docs))
      })
      .catch((e) => {
        console.error("Error cargando datos de configuración de terceros:", e)
      })
      .finally(() => setLoading(false))
  }, [])

  return { condicionesIva, monedas, tiposDocumento, loading }
}

export function useProveedores(options: UseTercerosOptions = {}) {
  const [terceros, setTerceros] = useState<Tercero[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")

  const fetchProveedores = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        soloProveedores: "true",
        page: String(page),
        pageSize: "50",
        search,
      })

      if (options.soloActivos ?? true) {
        params.set("soloActivos", "true")
      }

      const result = await apiGet<PagedResult<Tercero>>(`/api/terceros?${params.toString()}`)
      setTerceros(result.items)
      setTotalCount(result.totalCount)
      setTotalPages(result.totalPages)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar proveedores")
    } finally {
      setLoading(false)
    }
  }, [options.soloActivos, page, search])

  useEffect(() => {
    fetchProveedores()
  }, [fetchProveedores])

  const updateSearch = useCallback((value: string) => {
    setPage(1)
    setSearch(value)
  }, [])

  const createProveedor = async (dto: CreateTerceroDto): Promise<boolean> => {
    try {
      await apiPost<Tercero>("/api/terceros", dto)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear proveedor")
      return false
    }
  }

  const updateProveedor = async (id: number, dto: Partial<CreateTerceroDto>): Promise<boolean> => {
    try {
      await apiPut<Tercero>(`/api/terceros/${id}`, dto)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al actualizar proveedor")
      return false
    }
  }

  const deleteProveedor = async (id: number): Promise<boolean> => {
    try {
      await apiDelete(`/api/terceros/${id}`)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al desactivar proveedor")
      return false
    }
  }

  return {
    terceros,
    loading,
    error,
    totalCount,
    totalPages,
    page,
    setPage,
    search,
    setSearch: updateSearch,
    createProveedor,
    updateProveedor,
    deleteProveedor,
    refetch: fetchProveedores,
  }
}
