"use client"

import { useEffect, useState } from "react"

import type { Empleado } from "@/lib/types/empleados"

export type LegacyAddress = {
  id: string
  tipo: string
  calle: string
  numero: string
  piso: string
  departamento: string
  ciudad: string
  provincia: string
  codigoPostal: string
  pais: string
  referencia: string
}

export type LegacyContact = {
  id: string
  tipo: string
  valor: string
  observacion: string
}

export type LegacyProfile = {
  nombre: string
  apellido: string
  denominacionSocial: string
  tratamiento: string
  profesion: string
  estadoCivil: string
  nacionalidad: string
  sexo: string
  fechaNacimiento: string
  tipoDocumento: string
  nroDocumento: string
  nroInterno: string
  fechaRegistro: string
  pais: string
  facturable: boolean
  claveFiscal: string
  condicionFiscal: string
  valorClaveFiscal: string
  fotoUrl: string
  observacion: string
  aplicaComisionCobranzas: boolean
  comisionCobranzas: number
  aplicaComisionVentas: boolean
  comisionVentas: number
  domicilios: LegacyAddress[]
  contactos: LegacyContact[]
  perfiles: string[]
  areas: string[]
}

export type LegacyEmployeeLaborRecord = {
  puesto: string
  modalidad: string
  convenio: string
  jornada: string
  horasSemanales: number
  supervisor: string
  centroCosto: string
  obraSocial: string
  art: string
  sindicato: string
  banco: string
  cbu: string
  aliasBancario: string
  fechaAlta: string
  fechaAntiguedad: string
  fechaUltimoAscenso: string
  fechaBaja: string
  fechaAptoMedico: string
  fechaVencimientoCarnet: string
  estadoNomina: "activo" | "licencia" | "suspendido" | "egresado"
  sueldoVariable: number
  plusNoRemunerativo: number
  notas: string
}

export type LegacyEmployeeDocument = {
  id: string
  tipo: string
  numero: string
  emisor: string
  fechaEmision: string
  fechaVencimiento: string
  estado: "vigente" | "a-vencer" | "vencido" | "pendiente"
  observacion: string
}

export type LegacyEmployeeLeaveRecord = {
  id: string
  tipo: "vacaciones" | "licencia" | "ausencia" | "accidente"
  desde: string
  hasta: string
  estado: "planificado" | "en-curso" | "cerrado"
  observacion: string
}

export type LegacyPayrollConcept = {
  id: string
  concepto: string
  tipo: "haber" | "descuento" | "aporte"
  importe: number
}

export type LegacyPayrollLiquidation = {
  id: string
  periodo: string
  tipo: "mensual" | "sac" | "vacaciones" | "liquidacion-final" | "ajuste"
  fechaLiquidacion: string
  fechaPago: string
  bruto: number
  descuentos: number
  neto: number
  estado: "borrador" | "liquidado" | "pagado"
  reciboNumero: string
  observacion: string
  conceptos: LegacyPayrollConcept[]
}

export const LEGACY_PROFILE_STORAGE_KEY = "zuluia_empleados_legacy_profiles"
const LABOR_STORAGE_KEY = "zuluia_empleados_labor_records"
const DOCUMENTS_STORAGE_KEY = "zuluia_empleados_documents"
const LEAVES_STORAGE_KEY = "zuluia_empleados_leave_records"
const PAYROLL_STORAGE_KEY = "zuluia_empleados_payroll"

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`
}

function loadStoredValue<T>(storageKey: string, fallback: T): T {
  if (typeof window === "undefined") return fallback

  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as T
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function useStoredState<T>(storageKey: string, fallback: T) {
  const [value, setValue] = useState<T>(() => loadStoredValue(storageKey, fallback))

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(value))
  }, [storageKey, value])

  return [value, setValue] as const
}

export function emptyAddress(): LegacyAddress {
  return {
    id: createId("addr"),
    tipo: "Principal",
    calle: "",
    numero: "",
    piso: "",
    departamento: "",
    ciudad: "",
    provincia: "",
    codigoPostal: "",
    pais: "Argentina",
    referencia: "",
  }
}

export function emptyContact(): LegacyContact {
  return {
    id: createId("contact"),
    tipo: "Email",
    valor: "",
    observacion: "",
  }
}

export function buildDefaultLegacyProfile(empleado?: Empleado | null): LegacyProfile {
  const displayName = empleado?.razonSocial?.trim() ?? ""
  const nameParts = displayName.split(" ").filter(Boolean)
  const nombre = nameParts.slice(0, -1).join(" ") || nameParts[0] || ""
  const apellido = nameParts.length > 1 ? nameParts[nameParts.length - 1] : ""

  return {
    nombre,
    apellido,
    denominacionSocial: empleado?.razonSocial ?? "",
    tratamiento: "Sr.",
    profesion: "",
    estadoCivil: "Soltero/a",
    nacionalidad: "Argentina",
    sexo: "No informa",
    fechaNacimiento: "",
    tipoDocumento: empleado?.cuit ? "CUIT" : "DNI",
    nroDocumento: empleado?.cuit ?? "",
    nroInterno: "",
    fechaRegistro: empleado?.fechaIngreso?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    pais: "Argentina",
    facturable: false,
    claveFiscal: "Sin sincronizar",
    condicionFiscal: "Responsable Inscripto",
    valorClaveFiscal: "",
    fotoUrl: "",
    observacion: "",
    aplicaComisionCobranzas: false,
    comisionCobranzas: 0,
    aplicaComisionVentas: false,
    comisionVentas: 0,
    domicilios: [emptyAddress()],
    contactos: [emptyContact()],
    perfiles: [],
    areas: [],
  }
}

export function buildDefaultLaborRecord(empleado?: Empleado | null): LegacyEmployeeLaborRecord {
  const fechaBase = empleado?.fechaIngreso?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)

  return {
    puesto: empleado?.categoria ?? "Analista",
    modalidad: "Mensualizado",
    convenio: "Convenio general",
    jornada: "Completa",
    horasSemanales: 45,
    supervisor: "Sin asignar",
    centroCosto: "Administracion",
    obraSocial: "Sin informar",
    art: "Sin informar",
    sindicato: "No afiliado",
    banco: "Sin asignar",
    cbu: "",
    aliasBancario: "",
    fechaAlta: fechaBase,
    fechaAntiguedad: fechaBase,
    fechaUltimoAscenso: "",
    fechaBaja: "",
    fechaAptoMedico: "",
    fechaVencimientoCarnet: "",
    estadoNomina: empleado?.estado === "activo" ? "activo" : "licencia",
    sueldoVariable: 0,
    plusNoRemunerativo: 0,
    notas: "",
  }
}

export function buildDefaultDocuments(empleado?: Empleado | null): LegacyEmployeeDocument[] {
  return [
    {
      id: createId("doc"),
      tipo: "Documento principal",
      numero: empleado?.cuit ?? "",
      emisor: "Legajo base",
      fechaEmision: empleado?.fechaIngreso?.slice(0, 10) ?? "",
      fechaVencimiento: "",
      estado: "vigente",
      observacion: "Replica documental local hasta publicar backend de documentación.",
    },
  ]
}

export function buildDefaultLeaves(): LegacyEmployeeLeaveRecord[] {
  return [
    {
      id: createId("leave"),
      tipo: "vacaciones",
      desde: "",
      hasta: "",
      estado: "planificado",
      observacion: "Sin novedades registradas aun.",
    },
  ]
}

export function buildDefaultPayrollLiquidations(
  empleado?: Empleado | null,
  laborRecord?: LegacyEmployeeLaborRecord
): LegacyPayrollLiquidation[] {
  const sueldoBasico = Number(empleado?.sueldoBasico ?? 0)
  const plus = Number(laborRecord?.plusNoRemunerativo ?? 0)
  const bruto = sueldoBasico + plus
  const descuentos = Math.round(bruto * 0.17)
  const now = new Date()
  const periodo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

  return [
    {
      id: createId("liq"),
      periodo,
      tipo: "mensual",
      fechaLiquidacion: `${periodo}-28`,
      fechaPago: `${periodo}-30`,
      bruto,
      descuentos,
      neto: bruto - descuentos,
      estado: "liquidado",
      reciboNumero: `REC-${empleado?.legajo ?? "0000"}-${periodo.replace("-", "")}`,
      observacion: "Liquidacion local de referencia hasta integrar backend de sueldos.",
      conceptos: [
        {
          id: createId("concept"),
          concepto: "Sueldo basico",
          tipo: "haber",
          importe: sueldoBasico,
        },
        {
          id: createId("concept"),
          concepto: "Plus no remunerativo",
          tipo: "haber",
          importe: plus,
        },
        {
          id: createId("concept"),
          concepto: "Aportes y descuentos",
          tipo: "descuento",
          importe: descuentos,
        },
      ],
    },
  ]
}

export function getRosterStatus(empleado: Empleado, legacyProfile: LegacyProfile) {
  const missingFields = [
    empleado.legajo,
    empleado.categoria,
    empleado.fechaIngreso,
    empleado.cuit,
    legacyProfile.nombre || legacyProfile.denominacionSocial,
    legacyProfile.tipoDocumento,
    legacyProfile.nroDocumento,
    legacyProfile.condicionFiscal,
  ].filter((value) => !value).length

  if (missingFields === 0) return "Completo"
  if (missingFields <= 2) return "Con alerta"
  return "Incompleto"
}

export function getDisplayName(empleado: Empleado, legacyProfile: LegacyProfile) {
  const fullName = [legacyProfile.nombre, legacyProfile.apellido].filter(Boolean).join(" ").trim()
  return (
    fullName ||
    legacyProfile.denominacionSocial ||
    empleado.razonSocial ||
    `Empleado ${empleado.id}`
  )
}

export function getPrimaryContact(profile: LegacyProfile) {
  return profile.contactos.find((contact) => contact.valor.trim()) ?? profile.contactos[0] ?? null
}

export function getPrimaryAddress(profile: LegacyProfile) {
  return profile.domicilios.find((address) => address.calle.trim()) ?? profile.domicilios[0] ?? null
}

export function useLegacyEmployeeProfiles() {
  return useStoredState<Record<string, LegacyProfile>>(LEGACY_PROFILE_STORAGE_KEY, {})
}

export function useLegacyEmployeeLaborRecords() {
  return useStoredState<Record<string, LegacyEmployeeLaborRecord>>(LABOR_STORAGE_KEY, {})
}

export function useLegacyEmployeeDocuments() {
  return useStoredState<Record<string, LegacyEmployeeDocument[]>>(DOCUMENTS_STORAGE_KEY, {})
}

export function useLegacyEmployeeLeaves() {
  return useStoredState<Record<string, LegacyEmployeeLeaveRecord[]>>(LEAVES_STORAGE_KEY, {})
}

export function useLegacyEmployeePayroll() {
  return useStoredState<Record<string, LegacyPayrollLiquidation[]>>(PAYROLL_STORAGE_KEY, {})
}
