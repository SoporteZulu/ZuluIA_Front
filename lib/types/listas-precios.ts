export interface ItemEnLista {
  itemId: number
  itemDescripcion: string
  itemCodigo: string
  precio: number
  descuentoPct: number
}

export interface ListaPrecios {
  id: number
  nombre: string
  monedaId: number
  monedaSimbolo?: string
  vigenciaDesde: string | null
  vigenciaHasta: string | null
  activa: boolean
  esDefault: boolean
  createdAt: string
}

export interface ListaPreciosDetalle extends ListaPrecios {
  items: ItemEnLista[]
}

export interface CreateListaPreciosDto {
  nombre: string
  monedaId: number
  vigenciaDesde?: string | null
  vigenciaHasta?: string | null
  esDefault?: boolean
}

export interface UpsertItemEnListaDto {
  itemId: number
  precio: number
  descuentoPct: number
}

export interface ItemPrecioResult {
  itemId: number
  listaPreciosId: number | null
  precio: number
  monedaId: number
  monedaSimbolo: string
  descuentoPct: number
}
