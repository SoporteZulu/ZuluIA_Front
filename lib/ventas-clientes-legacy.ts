import type { Tercero } from "@/lib/types/terceros"

export type LegacyCustomerContact = {
  id: string
  nombre: string
  cargo: string
  email: string
  telefono: string
  sector: string
  principal: boolean
}

export type LegacyCustomerBranch = {
  id: string
  descripcion: string
  direccion: string
  localidad: string
  responsable: string
  telefono: string
  horario: string
  principal: boolean
}

export type LegacyCustomerTransport = {
  id: string
  nombre: string
  servicio: string
  zona: string
  frecuencia: string
  observacion: string
  activo: boolean
}

export type LegacyCustomerCollectionWindow = {
  id: string
  dia: string
  franja: string
  canal: string
  responsable: string
}

export type LegacyCustomerProfile = {
  customerId: number
  zonaComercial: string
  rubro: string
  subrubro: string
  condicionCobranza: string
  riesgoCrediticio: "normal" | "alerta" | "bloqueado"
  saldoMaximoVigente: number | null
  vigenciaSaldo: string
  observacionLegacy: string
  contactos: LegacyCustomerContact[]
  sucursales: LegacyCustomerBranch[]
  transportes: LegacyCustomerTransport[]
  ventanasCobranza: LegacyCustomerCollectionWindow[]
}

function buildId(prefix: string) {
  return `${prefix}-${globalThis.crypto.randomUUID()}`
}

export function buildLegacyCustomerProfile(customer?: Tercero | null): LegacyCustomerProfile {
  return {
    customerId: customer?.id ?? 0,
    zonaComercial: customer?.localidadDescripcion
      ? `Zona ${customer.localidadDescripcion}`
      : "Zona sin definir",
    rubro: "General",
    subrubro: "Cuenta corriente",
    condicionCobranza: "Cobranza administrativa",
    riesgoCrediticio: customer?.activo ? "normal" : "alerta",
    saldoMaximoVigente: customer?.limiteCredito ?? null,
    vigenciaSaldo: "Sin vigencia específica",
    observacionLegacy:
      customer?.observacion ??
      "Overlay local para cubrir contactos, sucursales, transportes y ventanas de cobranza del legado.",
    contactos: [
      {
        id: buildId("contacto"),
        nombre: customer?.razonSocial ?? "Contacto principal",
        cargo: "Administración",
        email: customer?.email ?? "",
        telefono: customer?.telefono ?? customer?.celular ?? "",
        sector: "Comercial",
        principal: true,
      },
    ],
    sucursales: [
      {
        id: buildId("sucursal"),
        descripcion: customer?.nombreFantasia ?? customer?.razonSocial ?? "Casa central",
        direccion:
          [customer?.calle, customer?.nro, customer?.piso, customer?.dpto]
            .filter(Boolean)
            .join(" ") || "Sin dirección declarada",
        localidad: customer?.localidadDescripcion ?? "Sin localidad",
        responsable: "Cuenta principal",
        telefono: customer?.telefono ?? customer?.celular ?? "",
        horario: "Lunes a viernes 08:00 a 17:00",
        principal: true,
      },
    ],
    transportes: [
      {
        id: buildId("transporte"),
        nombre: "Retiro cliente",
        servicio: "Entrega coordinada",
        zona: customer?.localidadDescripcion ?? "Sin zona",
        frecuencia: "A demanda",
        observacion: "Completar transportista real cuando exista backend dedicado.",
        activo: true,
      },
    ],
    ventanasCobranza: [
      {
        id: buildId("cobranza"),
        dia: "Miércoles",
        franja: "09:00 a 12:00",
        canal: customer?.email ? "Email y seguimiento" : "Llamado telefónico",
        responsable: customer?.cobradorId
          ? `Cobrador #${customer.cobradorId}`
          : "Cobrador sin asignar",
      },
    ],
  }
}
