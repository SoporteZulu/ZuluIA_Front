"use client"

import { useState, useEffect, useCallback } from "react"
import { apiGet, apiPost, apiPut } from "@/lib/api"
import type { Caja, TipoCaja, CreateCajaDto, UpdateCajaDto } from "@/lib/types/cajas"

type CajaApi = Partial<Caja> & {
  id: number
  sucursalId: number
  tipoId?: number | null
  descripcion?: string | null
  activa?: boolean | null
  esCaja?: boolean | null
  usuarioId?: number | null
  nroCierreActual?: number | null
}

function getDefaultTipoDescripcion(esCaja?: boolean | null) {
  if (esCaja === true) {
    return "CAJA"
  }

  if (esCaja === false) {
    return "CUENTA BANCARIA"
  }

  return undefined
}

function normalizeCaja(caja: CajaApi): Caja {
  const descripcion = caja.descripcion?.trim() || `Caja ${caja.id}`
  const nombre = caja.nombre?.trim() || descripcion

  return {
    id: caja.id,
    sucursalId: caja.sucursalId,
    tipoCajaId: caja.tipoCajaId ?? caja.tipoId ?? 0,
    tipoCajaDescripcion: caja.tipoCajaDescripcion?.trim() || getDefaultTipoDescripcion(caja.esCaja),
    nombre,
    descripcion,
    monedaId: caja.monedaId,
    activa: caja.activa ?? true,
    saldoActual: Number(caja.saldoActual ?? 0),
    fechaApertura: caja.fechaApertura,
    saldoInicial: Number(caja.saldoInicial ?? 0),
    esCaja: caja.esCaja ?? true,
    banco: caja.banco,
    nroCuenta: caja.nroCuenta,
    cbu: caja.cbu,
    usuarioId: caja.usuarioId ?? undefined,
    nroCierreActual: caja.nroCierreActual ?? undefined,
  }
}

export function useCajas(sucursalId?: number) {
  const [cajas, setCajas] = useState<Caja[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCajas = useCallback(async () => {
    if (!sucursalId) {
      setCajas([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await apiGet<CajaApi[]>(`/api/cajas?sucursalId=${sucursalId}`)
      setCajas((Array.isArray(result) ? result : []).map(normalizeCaja))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar cajas")
    } finally {
      setLoading(false)
    }
  }, [sucursalId])

  useEffect(() => {
    fetchCajas()
  }, [fetchCajas])

  const getTipos = useCallback(async (): Promise<TipoCaja[]> => {
    try {
      const result = await apiGet<TipoCaja[]>("/api/cajas/tipos")
      return Array.isArray(result) ? result : []
    } catch {
      return []
    }
  }, [])

  const crear = async (dto: CreateCajaDto): Promise<boolean> => {
    try {
      await apiPost<{ id: number }>("/api/cajas", dto)
      await fetchCajas()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear caja")
      return false
    }
  }

  const actualizar = async (id: number, dto: CreateCajaDto): Promise<boolean> => {
    try {
      const payload: UpdateCajaDto = {
        id,
        descripcion: dto.descripcion,
        tipoId: dto.tipoId,
        monedaId: dto.monedaId,
        esCaja: dto.esCaja,
        banco: dto.banco,
        nroCuenta: dto.nroCuenta,
        cbu: dto.cbu,
        usuarioId: dto.usuarioId,
      }

      await apiPut<void>(`/api/cajas/${id}`, payload)
      await fetchCajas()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al actualizar caja")
      return false
    }
  }

  return { cajas, loading, error, getTipos, crear, actualizar, refetch: fetchCajas }
}
