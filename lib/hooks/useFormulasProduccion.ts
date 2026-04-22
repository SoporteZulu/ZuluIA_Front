"use client"

import { useState, useEffect, useCallback } from "react"
import { apiDelete, apiFetch, apiGet, apiPost, apiPut } from "@/lib/api"
import type {
  CreateFormulaProduccionDto,
  FormulaProduccion,
  FormulaProduccionHistorial,
  UpdateFormulaProduccionDto,
} from "@/lib/types/formulas-produccion"

type RawFormulaIngrediente = {
  id?: number
  itemId?: number
  itemCodigo?: string
  itemDescripcion?: string
  cantidad?: number
  unidadMedidaId?: number | null
  unidadMedidaDescripcion?: string | null
  esOpcional?: boolean
  orden?: number
}

type RawFormulaProduccion = {
  id?: number
  codigo?: string
  descripcion?: string
  itemProductoId?: number
  itemResultadoId?: number
  itemProductoCodigo?: string
  itemResultadoCodigo?: string
  itemProductoDescripcion?: string
  itemResultadoDescripcion?: string
  cantidadProducida?: number
  cantidadResultado?: number
  unidadMedidaId?: number | null
  unidadMedidaDescripcion?: string | null
  activa?: boolean
  activo?: boolean
  observacion?: string | null
  createdAt?: string
  componentes?: RawFormulaIngrediente[]
  ingredientes?: RawFormulaIngrediente[]
}

type RawFormulaHistorial = {
  id?: number
  formulaId?: number
  version?: number
  codigo?: string
  descripcion?: string
  cantidadResultado?: number
  motivo?: string | null
  snapshotJson?: string | null
  createdAt?: string
  createdBy?: string | number | null
}

function normalizeFormula(raw: RawFormulaProduccion): FormulaProduccion {
  const componentes = (raw.componentes ?? raw.ingredientes ?? []).map((componente, index) => ({
    id: Number(componente.id ?? index + 1),
    itemId: Number(componente.itemId ?? 0),
    itemCodigo: componente.itemCodigo,
    itemDescripcion: componente.itemDescripcion,
    cantidad: Number(componente.cantidad ?? 0),
    unidadMedidaId: componente.unidadMedidaId ?? null,
    unidadMedidaDescripcion: componente.unidadMedidaDescripcion ?? null,
    esOpcional: Boolean(componente.esOpcional),
    orden: Number(componente.orden ?? index + 1),
  }))

  return {
    id: Number(raw.id ?? 0),
    codigo: raw.codigo,
    descripcion: String(raw.descripcion ?? ""),
    itemProductoId: Number(raw.itemProductoId ?? raw.itemResultadoId ?? 0),
    itemProductoCodigo: raw.itemProductoCodigo ?? raw.itemResultadoCodigo,
    itemProductoDescripcion: raw.itemProductoDescripcion ?? raw.itemResultadoDescripcion,
    cantidadProducida: Number(raw.cantidadProducida ?? raw.cantidadResultado ?? 0),
    unidadMedidaId: raw.unidadMedidaId ?? null,
    unidadMedidaDescripcion: raw.unidadMedidaDescripcion ?? null,
    activa: Boolean(raw.activa ?? raw.activo ?? true),
    observacion: raw.observacion ?? null,
    createdAt: raw.createdAt,
    componentes,
  }
}

function normalizeHistorial(raw: RawFormulaHistorial): FormulaProduccionHistorial {
  return {
    id: Number(raw.id ?? 0),
    formulaId: Number(raw.formulaId ?? 0),
    version: Number(raw.version ?? 0),
    codigo: String(raw.codigo ?? ""),
    descripcion: String(raw.descripcion ?? ""),
    cantidadResultado: Number(raw.cantidadResultado ?? 0),
    motivo: raw.motivo ?? null,
    snapshotJson: raw.snapshotJson ?? null,
    createdAt: raw.createdAt,
    createdBy: raw.createdBy ?? null,
  }
}

export function useFormulasProduccion(soloActivas = true) {
  const [formulas, setFormulas] = useState<FormulaProduccion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFormulas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiGet<RawFormulaProduccion[]>(
        `/api/formulas-produccion?soloActivas=${soloActivas}`
      )
      setFormulas(Array.isArray(result) ? result.map(normalizeFormula) : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar fórmulas de producción")
    } finally {
      setLoading(false)
    }
  }, [soloActivas])

  useEffect(() => {
    fetchFormulas()
  }, [fetchFormulas])

  const getById = async (id: number): Promise<FormulaProduccion | null> => {
    try {
      const result = await apiGet<RawFormulaProduccion>(`/api/formulas-produccion/${id}`)
      return normalizeFormula(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar fórmula")
      return null
    }
  }

  const crear = async (dto: CreateFormulaProduccionDto): Promise<number | null> => {
    try {
      const payload = {
        codigo: dto.codigo.trim(),
        descripcion: dto.descripcion.trim(),
        itemResultadoId: dto.itemProductoId,
        cantidadResultado: dto.cantidadProducida,
        unidadMedidaId: null,
        observacion: dto.observacion ?? null,
        ingredientes: (dto.componentes ?? []).map((componente, index) => ({
          itemId: componente.itemId,
          cantidad: componente.cantidad,
          unidadMedidaId: null,
          esOpcional: false,
          orden: index + 1,
        })),
      }

      const created = await apiPost<{ id: number }>("/api/formulas-produccion", payload)
      const formulaId = Number(created?.id ?? 0)

      if (!formulaId) {
        throw new Error("No se recibió el identificador de la fórmula creada")
      }

      if (dto.activa === false) {
        await apiDelete(`/api/formulas-produccion/${formulaId}`)
      }

      await fetchFormulas()
      return formulaId
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear fórmula de producción")
      return null
    }
  }

  const actualizar = async (
    id: number,
    dto: UpdateFormulaProduccionDto
  ): Promise<boolean> => {
    try {
      await apiPut(`/api/formulas-produccion/${id}`, {
        descripcion: dto.descripcion.trim(),
        cantidadResultado: dto.cantidadProducida,
        observacion: dto.observacion ?? null,
      })
      await fetchFormulas()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al actualizar fórmula de producción")
      return false
    }
  }

  const getHistorial = async (id: number): Promise<FormulaProduccionHistorial[]> => {
    try {
      const result = await apiGet<RawFormulaHistorial[]>(`/api/formulas-produccion/${id}/historial`)
      return Array.isArray(result) ? result.map(normalizeHistorial) : []
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar historial de fórmula")
      return []
    }
  }

  const activar = async (id: number): Promise<boolean> => {
    try {
      await apiFetch<void>(`/api/formulas-produccion/${id}/activar`, { method: "PATCH" })
      await fetchFormulas()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al activar fórmula de producción")
      return false
    }
  }

  const desactivar = async (id: number): Promise<boolean> => {
    try {
      await apiDelete(`/api/formulas-produccion/${id}`)
      await fetchFormulas()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al desactivar fórmula de producción")
      return false
    }
  }

  return {
    formulas,
    loading,
    error,
    getById,
    getHistorial,
    crear,
    actualizar,
    activar,
    desactivar,
    refetch: fetchFormulas,
  }
}
