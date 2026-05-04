"use client"

import { useCallback, useEffect, useState } from "react"

import { apiDelete, apiFetch, apiGet, apiPost, apiPut } from "@/lib/api"
import type {
  AtributoInventario,
  CategoriaItem,
  CreateAtributoDto,
  CreateCategoriaItemDto,
  CreateMarcaDto,
  CreateUnidadMedidaDto,
  Item,
  ItemAtributoValor,
  MarcaComercial,
  PagedResult,
  UnidadMedida,
  UpdateCategoriaItemDto,
  UpdateUnidadMedidaDto,
} from "@/lib/types/items"

function normalizeCategoria(row: CategoriaItem): CategoriaItem {
  return {
    ...row,
    parentId: row.parentId ?? null,
    nivel: Number(row.nivel ?? 0),
    ordenNivel: row.ordenNivel ?? null,
    activo: row.activo ?? true,
    hijos: row.hijos ?? [],
  }
}

function normalizeMarca(row: MarcaComercial): MarcaComercial {
  return {
    ...row,
    activo: row.activo ?? true,
  }
}

function normalizeAtributo(row: AtributoInventario): AtributoInventario {
  return {
    ...row,
    tipo: row.tipo ?? "texto",
    requerido: row.requerido ?? false,
    activo: row.activo ?? true,
  }
}

function normalizeUnidad(row: UnidadMedida): UnidadMedida {
  return {
    ...row,
    disminutivo:
      row.disminutivo ?? (row as UnidadMedida & { diminutivo?: string | null }).diminutivo ?? null,
    multiplicador: Number(row.multiplicador ?? 1),
    esUnidadBase: row.esUnidadBase ?? true,
    unidadBaseId: row.unidadBaseId ?? null,
    activa: row.activa ?? true,
  }
}

function normalizeItemAtributo(row: ItemAtributoValor): ItemAtributoValor {
  return {
    ...row,
    itemId: row.itemId,
    descripcion: row.descripcion ?? undefined,
    tipo: row.tipo ?? undefined,
    valor: row.valor ?? "",
  }
}

export function useCategoriasItems() {
  const [categorias, setCategorias] = useState<CategoriaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCategorias = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiGet<CategoriaItem[]>("/api/categorias-items/plano")
      setCategorias((Array.isArray(result) ? result : []).map(normalizeCategoria))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar categorías de items")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchCategorias()
  }, [fetchCategorias])

  const crear = useCallback(
    async (dto: CreateCategoriaItemDto) => {
      setSaving(true)
      setError(null)
      try {
        await apiPost("/api/categorias-items", dto)
        await fetchCategorias()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al crear la categoría")
        return false
      } finally {
        setSaving(false)
      }
    },
    [fetchCategorias]
  )

  const actualizar = useCallback(
    async (id: number, dto: UpdateCategoriaItemDto) => {
      setSaving(true)
      setError(null)
      try {
        await apiPut(`/api/categorias-items/${id}`, dto)
        await fetchCategorias()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al actualizar la categoría")
        return false
      } finally {
        setSaving(false)
      }
    },
    [fetchCategorias]
  )

  const eliminar = useCallback(
    async (id: number) => {
      setSaving(true)
      setError(null)
      try {
        await apiDelete(`/api/categorias-items/${id}`)
        await fetchCategorias()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al desactivar la categoría")
        return false
      } finally {
        setSaving(false)
      }
    },
    [fetchCategorias]
  )

  const activar = useCallback(
    async (id: number) => {
      setSaving(true)
      setError(null)
      try {
        await apiFetch(`/api/categorias-items/${id}/activar`, { method: "PATCH" })
        await fetchCategorias()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al activar la categoría")
        return false
      } finally {
        setSaving(false)
      }
    },
    [fetchCategorias]
  )

  return {
    categorias,
    loading,
    saving,
    error,
    crear,
    actualizar,
    eliminar,
    activar,
    refetch: fetchCategorias,
  }
}

export function useMarcas(soloActivas?: boolean) {
  const [marcas, setMarcas] = useState<MarcaComercial[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMarcas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const query = typeof soloActivas === "boolean" ? `?soloActivas=${soloActivas}` : ""
      const result = await apiGet<MarcaComercial[]>(`/api/marcas${query}`)
      setMarcas((Array.isArray(result) ? result : []).map(normalizeMarca))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar marcas")
    } finally {
      setLoading(false)
    }
  }, [soloActivas])

  useEffect(() => {
    void fetchMarcas()
  }, [fetchMarcas])

  const crear = useCallback(
    async (dto: CreateMarcaDto) => {
      setSaving(true)
      setError(null)
      try {
        await apiPost("/api/marcas", dto)
        await fetchMarcas()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al crear la marca")
        return false
      } finally {
        setSaving(false)
      }
    },
    [fetchMarcas]
  )

  const actualizar = useCallback(
    async (id: number, dto: CreateMarcaDto) => {
      setSaving(true)
      setError(null)
      try {
        await apiPut(`/api/marcas/${id}`, dto)
        await fetchMarcas()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al actualizar la marca")
        return false
      } finally {
        setSaving(false)
      }
    },
    [fetchMarcas]
  )

  const cambiarEstado = useCallback(
    async (id: number, activo: boolean) => {
      setSaving(true)
      setError(null)
      try {
        await apiFetch(`/api/marcas/${id}/${activo ? "activar" : "desactivar"}`, {
          method: "PATCH",
        })
        await fetchMarcas()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al cambiar el estado de la marca")
        return false
      } finally {
        setSaving(false)
      }
    },
    [fetchMarcas]
  )

  return {
    marcas,
    loading,
    saving,
    error,
    crear,
    actualizar,
    cambiarEstado,
    refetch: fetchMarcas,
  }
}

export function useAtributos(soloActivos = false) {
  const [atributos, setAtributos] = useState<AtributoInventario[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAtributos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiGet<AtributoInventario[]>(`/api/atributos?soloActivos=${soloActivos}`)
      setAtributos((Array.isArray(result) ? result : []).map(normalizeAtributo))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar atributos")
    } finally {
      setLoading(false)
    }
  }, [soloActivos])

  useEffect(() => {
    void fetchAtributos()
  }, [fetchAtributos])

  const crear = useCallback(
    async (dto: CreateAtributoDto) => {
      setSaving(true)
      setError(null)
      try {
        await apiPost("/api/atributos", dto)
        await fetchAtributos()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al crear el atributo")
        return false
      } finally {
        setSaving(false)
      }
    },
    [fetchAtributos]
  )

  const actualizar = useCallback(
    async (id: number, dto: CreateAtributoDto) => {
      setSaving(true)
      setError(null)
      try {
        await apiPut(`/api/atributos/${id}`, dto)
        await fetchAtributos()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al actualizar el atributo")
        return false
      } finally {
        setSaving(false)
      }
    },
    [fetchAtributos]
  )

  const cambiarEstado = useCallback(
    async (id: number, activo: boolean) => {
      setSaving(true)
      setError(null)
      try {
        await apiFetch(`/api/atributos/${id}/${activo ? "activar" : "desactivar"}`, {
          method: "PATCH",
        })
        await fetchAtributos()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al cambiar el estado del atributo")
        return false
      } finally {
        setSaving(false)
      }
    },
    [fetchAtributos]
  )

  return {
    atributos,
    loading,
    saving,
    error,
    crear,
    actualizar,
    cambiarEstado,
    refetch: fetchAtributos,
  }
}

export function useItemAtributos(itemId?: number) {
  const [atributos, setAtributos] = useState<ItemAtributoValor[]>([])
  const [loading, setLoading] = useState(Boolean(itemId))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchItemAtributos = useCallback(async () => {
    if (!itemId) {
      setAtributos([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await apiGet<ItemAtributoValor[]>(`/api/atributos/item/${itemId}`)
      setAtributos((Array.isArray(result) ? result : []).map(normalizeItemAtributo))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar atributos del item")
      setAtributos([])
    } finally {
      setLoading(false)
    }
  }, [itemId])

  useEffect(() => {
    void fetchItemAtributos()
  }, [fetchItemAtributos])

  const guardarValor = useCallback(
    async (atributoId: number, valor: string) => {
      if (!itemId) return false

      setSaving(true)
      setError(null)
      try {
        await apiPost(`/api/atributos/item/${itemId}`, { atributoId, valor })
        await fetchItemAtributos()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al guardar el atributo del item")
        return false
      } finally {
        setSaving(false)
      }
    },
    [fetchItemAtributos, itemId]
  )

  const eliminarValor = useCallback(
    async (atributoId: number) => {
      if (!itemId) return false

      setSaving(true)
      setError(null)
      try {
        await apiDelete(`/api/atributos/item/${itemId}/${atributoId}`)
        await fetchItemAtributos()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al eliminar el atributo del item")
        return false
      } finally {
        setSaving(false)
      }
    },
    [fetchItemAtributos, itemId]
  )

  return {
    atributos,
    loading,
    saving,
    error,
    guardarValor,
    eliminarValor,
    refetch: fetchItemAtributos,
  }
}

export function useUnidadesMedida(soloActivas = false) {
  const [unidades, setUnidades] = useState<UnidadMedida[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUnidades = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiGet<UnidadMedida[]>(`/api/unidades-medida?soloActivas=${soloActivas}`)
      setUnidades((Array.isArray(result) ? result : []).map(normalizeUnidad))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar unidades de medida")
    } finally {
      setLoading(false)
    }
  }, [soloActivas])

  useEffect(() => {
    void fetchUnidades()
  }, [fetchUnidades])

  const crear = useCallback(
    async (dto: CreateUnidadMedidaDto) => {
      setSaving(true)
      setError(null)
      try {
        await apiPost("/api/unidades-medida", dto)
        await fetchUnidades()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al crear la unidad de medida")
        return false
      } finally {
        setSaving(false)
      }
    },
    [fetchUnidades]
  )

  const actualizar = useCallback(
    async (id: number, dto: UpdateUnidadMedidaDto) => {
      setSaving(true)
      setError(null)
      try {
        await apiPut(`/api/unidades-medida/${id}`, dto)
        await fetchUnidades()
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al actualizar la unidad de medida")
        return false
      } finally {
        setSaving(false)
      }
    },
    [fetchUnidades]
  )

  const cambiarEstado = useCallback(
    async (id: number, activa: boolean) => {
      setSaving(true)
      setError(null)
      try {
        await apiFetch(`/api/unidades-medida/${id}/${activa ? "activar" : "desactivar"}`, {
          method: "PATCH",
        })
        await fetchUnidades()
        return true
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Error al cambiar el estado de la unidad de medida"
        )
        return false
      } finally {
        setSaving(false)
      }
    },
    [fetchUnidades]
  )

  return {
    unidades,
    loading,
    saving,
    error,
    crear,
    actualizar,
    cambiarEstado,
    refetch: fetchUnidades,
  }
}

export function useItemsCatalogSnapshot(pageSize = 500) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiGet<PagedResult<Item>>(
        `/api/items?soloActivos=true&page=1&pageSize=${pageSize}`
      )
      setItems(
        (result.items ?? []).map((item) => ({
          ...item,
          precioCosto: Number(item.precioCosto ?? 0),
          precioVenta: Number(item.precioVenta ?? 0),
          stockMinimo: Number(item.stockMinimo ?? 0),
          stockMaximo:
            item.stockMaximo !== null && item.stockMaximo !== undefined
              ? Number(item.stockMaximo)
              : null,
          stock: item.stock !== undefined ? Number(item.stock) : undefined,
        }))
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar el catálogo activo")
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [pageSize])

  useEffect(() => {
    void fetchItems()
  }, [fetchItems])

  return {
    items,
    loading,
    error,
    refetch: fetchItems,
  }
}
