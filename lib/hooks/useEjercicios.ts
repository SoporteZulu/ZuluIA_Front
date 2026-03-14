'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost } from '@/lib/api'
import type { Ejercicio, CreateEjercicioDto } from '@/lib/types/ejercicios'

export function useEjercicios() {
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEjercicios = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiGet<Ejercicio[]>('/api/ejercicios')
      setEjercicios(Array.isArray(result) ? result : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar ejercicios')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchEjercicios() }, [fetchEjercicios])

  const getById = async (id: number): Promise<Ejercicio | null> => {
    try {
      return await apiGet<Ejercicio>(`/api/ejercicios/${id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar ejercicio')
      return null
    }
  }

  const crear = async (dto: CreateEjercicioDto): Promise<boolean> => {
    try {
      await apiPost<{ id: number }>('/api/ejercicios', dto)
      await fetchEjercicios()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear ejercicio')
      return false
    }
  }

  const cerrar = async (id: number): Promise<boolean> => {
    try {
      await apiPost<{ mensaje: string }>(`/api/ejercicios/${id}/cerrar`, {})
      await fetchEjercicios()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cerrar ejercicio')
      return false
    }
  }

  const reabrir = async (id: number): Promise<boolean> => {
    try {
      await apiPost<{ mensaje: string }>(`/api/ejercicios/${id}/reabrir`, {})
      await fetchEjercicios()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al reabrir ejercicio')
      return false
    }
  }

  return {
    ejercicios,
    loading,
    error,
    getById,
    crear,
    cerrar,
    reabrir,
    refetch: fetchEjercicios,
  }
}

/** Retorna el ejercicio vigente (el primero no cerrado), útil para defaults de UI. */
export function useEjercicioVigente() {
  const [ejercicio, setEjercicio] = useState<Ejercicio | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiGet<Ejercicio>('/api/ejercicios/vigente')
      .then((e) => setEjercicio(e))
      .catch(() => setEjercicio(null))
      .finally(() => setLoading(false))
  }, [])

  return { ejercicio, loading }
}
