'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost } from '@/lib/api'
import type { FormulaProduccion, CreateFormulaProduccionDto } from '@/lib/types/formulas-produccion'

export function useFormulasProduccion(soloActivas = true) {
  const [formulas, setFormulas] = useState<FormulaProduccion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFormulas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiGet<FormulaProduccion[]>(
        `/api/formulas-produccion?soloActivas=${soloActivas}`
      )
      setCleaned(Array.isArray(result) ? result : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar fórmulas de producción')
    } finally {
      setLoading(false)
    }

    function setCleaned(items: FormulaProduccion[]) {
      setFormulas(
        items.map(f => ({
          ...f,
          cantidadProducida: Number(f.cantidadProducida ?? 0),
          componentes: (f.componentes ?? []).map(c => ({
            ...c,
            cantidad: Number(c.cantidad ?? 0),
          })),
        }))
      )
    }
  }, [soloActivas])

  useEffect(() => { fetchFormulas() }, [fetchFormulas])

  const getById = async (id: number): Promise<FormulaProduccion | null> => {
    try {
      const result = await apiGet<FormulaProduccion>(`/api/formulas-produccion/${id}`)
      return {
        ...result,
        cantidadProducida: Number(result.cantidadProducida ?? 0),
        componentes: (result.componentes ?? []).map(c => ({
          ...c,
          cantidad: Number(c.cantidad ?? 0),
        })),
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar fórmula')
      return null
    }
  }

  const crear = async (dto: CreateFormulaProduccionDto): Promise<boolean> => {
    try {
      await apiPost<{ id: number }>('/api/formulas-produccion', dto)
      await fetchFormulas()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear fórmula de producción')
      return false
    }
  }

  return { formulas, loading, error, getById, crear, refetch: fetchFormulas }
}
