export interface Transportista {
  id: number
  terceroId: number
  terceroRazonSocial?: string
  terceroCuit?: string
  nroCuitTransportista?: string
  domicilioPartida?: string
  patente?: string
  marcaVehiculo?: string
  activo: boolean
}

export interface CreateTransportistaDto {
  terceroId: number
  nroCuitTransportista?: string
  domicilioPartida?: string
  patente?: string
  marcaVehiculo?: string
}

export interface UpdateTransportistaDto {
  domicilioPartida?: string
  patente?: string
  marcaVehiculo?: string
}
