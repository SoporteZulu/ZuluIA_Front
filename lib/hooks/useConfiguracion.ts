'use client'

import { useState, useEffect } from 'react'
import { apiGet } from '@/lib/api'
import type { FormaPago, CategoriaTercero, TipoDocumento, AlicuotaIva, UnidadMedida, CondicionIva } from '@/lib/types/configuracion'
import type { TipoComprobante } from '@/lib/types/comprobantes'

interface ConfiguracionData {
  formasPago: FormaPago[]
  categoriasTerceros: CategoriaTercero[]
  tiposDocumento: TipoDocumento[]
  tiposComprobante: TipoComprobante[]
  alicuotasIva: AlicuotaIva[]
  unidadesMedida: UnidadMedida[]
  condicionesIva: CondicionIva[]
}

export function useConfiguracion() {
  const [data, setData] = useState<ConfiguracionData>({
    formasPago: [],
    categoriasTerceros: [],
    tiposDocumento: [],
    tiposComprobante: [],
    alicuotasIva: [],
    unidadesMedida: [],
    condicionesIva: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      apiGet<FormaPago[]>('/api/configuracion/formas-pago'),
      apiGet<CategoriaTercero[]>('/api/configuracion/categorias-terceros'),
      apiGet<TipoDocumento[]>('/api/configuracion/tipos-documento'),
      apiGet<TipoComprobante[]>('/api/configuracion/tipos-comprobante'),
      apiGet<AlicuotaIva[]>('/api/configuracion/alicuotas-iva'),
      apiGet<UnidadMedida[]>('/api/configuracion/unidades-medida'),
      apiGet<CondicionIva[]>('/api/configuracion/condiciones-iva'),
    ])
      .then(([formasPago, categoriasTerceros, tiposDocumento, tiposComprobante, alicuotasIva, unidadesMedida, condicionesIva]) => {
        setData({
          formasPago:         Array.isArray(formasPago)         ? formasPago         : [],
          categoriasTerceros: Array.isArray(categoriasTerceros) ? categoriasTerceros : [],
          tiposDocumento:     Array.isArray(tiposDocumento)     ? tiposDocumento     : [],
          tiposComprobante:   Array.isArray(tiposComprobante)   ? tiposComprobante   : [],
          alicuotasIva:       Array.isArray(alicuotasIva)       ? alicuotasIva.map(a => ({ ...a, porcentaje: Number(a.porcentaje ?? 0) })) : [],
          unidadesMedida:     Array.isArray(unidadesMedida)     ? unidadesMedida     : [],
          condicionesIva:     Array.isArray(condicionesIva)     ? condicionesIva     : [],
        })
      })
      .catch((e) => console.error('Error cargando configuración:', e))
      .finally(() => setLoading(false))
  }, [])

  return { ...data, loading }
}

