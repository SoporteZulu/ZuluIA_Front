'use client'

import { useState, useEffect } from 'react'
import { apiGet } from '@/lib/api'
import type { FormaPago, CategoriaTercero, TipoDocumento } from '@/lib/types/configuracion'
import type { TipoComprobante } from '@/lib/types/comprobantes'

interface ConfiguracionData {
  formasPago: FormaPago[]
  categoriasTerceros: CategoriaTercero[]
  tiposDocumento: TipoDocumento[]
  tiposComprobante: TipoComprobante[]
}

export function useConfiguracion() {
  const [data, setData] = useState<ConfiguracionData>({
    formasPago: [],
    categoriasTerceros: [],
    tiposDocumento: [],
    tiposComprobante: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      apiGet<FormaPago[]>('/api/configuracion/formas-pago'),
      apiGet<CategoriaTercero[]>('/api/configuracion/categorias-terceros'),
      apiGet<TipoDocumento[]>('/api/configuracion/tipos-documento'),
      apiGet<TipoComprobante[]>('/api/configuracion/tipos-comprobante'),
    ])
      .then(([formasPago, categoriasTerceros, tiposDocumento, tiposComprobante]) => {
        setData({
          formasPago: Array.isArray(formasPago) ? formasPago : [],
          categoriasTerceros: Array.isArray(categoriasTerceros) ? categoriasTerceros : [],
          tiposDocumento: Array.isArray(tiposDocumento) ? tiposDocumento : [],
          tiposComprobante: Array.isArray(tiposComprobante) ? tiposComprobante : [],
        })
      })
      .catch((e) => console.error('Error cargando configuración:', e))
      .finally(() => setLoading(false))
  }, [])

  return { ...data, loading }
}

export function useGeografia() {
  const [paises, setPaises] = useState<{ id: number; descripcion: string }[]>([])
  const [provincias, setProvincias] = useState<{ id: number; descripcion: string; paisId: number }[]>([])
  const [localidades, setLocalidades] = useState<{ id: number; descripcion: string; provinciaId: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      apiGet<{ id: number; descripcion: string }[]>('/api/geografia/paises'),
      apiGet<{ id: number; descripcion: string; paisId: number }[]>('/api/geografia/provincias'),
      apiGet<{ id: number; descripcion: string; provinciaId: number }[]>('/api/geografia/localidades'),
    ])
      .then(([p, pr, l]) => {
        setPaises(Array.isArray(p) ? p : [])
        setProvincias(Array.isArray(pr) ? pr : [])
        setLocalidades(Array.isArray(l) ? l : [])
      })
      .catch((e) => console.error('Error cargando geografía:', e))
      .finally(() => setLoading(false))
  }, [])

  return { paises, provincias, localidades, loading }
}
