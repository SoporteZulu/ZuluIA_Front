"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import {
  Plus,
  Search,
  Edit,
  Eye,
  Mail,
  Phone,
  Building2,
  MapPin,
  ShieldCheck,
  BriefcaseBusiness,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Truck,
  Clock3,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useEmpleados } from "@/lib/hooks/useEmpleados"
import { useSucursales } from "@/lib/hooks/useSucursales"
import { useTerceros, useTercerosConfig } from "@/lib/hooks/useTerceros"
import { useGeografia } from "@/lib/hooks/useGeografia"
import { API_BASE_URL } from "@/lib/api-config"
import type {
  CreateTerceroDto,
  Tercero,
  TipoPersoneria,
  UpdateTerceroDto,
  TerceroPerfilComercial,
  TerceroContacto,
  TerceroSucursalEntrega,
  TerceroTransporte,
  TerceroVentanaCobranza,
} from "@/lib/types/terceros"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function activoBadge(activo: boolean) {
  return activo ? (
    <Badge variant="secondary" className="bg-green-500/10 text-green-600 text-xs">
      Activo
    </Badge>
  ) : (
    <Badge variant="secondary" className="bg-gray-500/10 text-gray-500 text-xs">
      Inactivo
    </Badge>
  )
}

function formatMoney(value: number | null | undefined) {
  if (value === null) return "Sin límite"
  if (value === undefined) return "Sin límite"
  return "$" + value.toLocaleString("es-AR")
}

function formatRelationLabel(label: string, id: number | null | undefined) {
  return id ? `${label} #${id}` : `Sin ${label.toLowerCase()}`
}

interface CustomerSections {
  perfilComercial: TerceroPerfilComercial
  contactos: TerceroContacto[]
  sucursalesEntrega: TerceroSucursalEntrega[]
  transportes: TerceroTransporte[]
  ventanasCobranza: TerceroVentanaCobranza[]
}

const MAX_CUSTOMER_DELIVERY_ADDRESSES = 3

function createDraftId(prefix: string) {
  return `${prefix}-${globalThis.crypto.randomUUID()}`
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim()
}

function nullableText(value: string | null | undefined) {
  const normalized = normalizeText(value)
  return normalized ? normalized : null
}

function formatTaxDocument(value: string | null | undefined) {
  const digits = (value ?? "").replace(/\D/g, "").slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`
}

function formatPhoneDisplay(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trimStart()
}

function withSinglePrincipal<T extends { id?: number | string; principal?: boolean }>(
  rows: T[],
  id: number | string | undefined,
  patch: Partial<T>
) {
  const nextPrincipal = patch.principal === true

  return rows.map((row) => {
    if (row.id === id) {
      return { ...row, ...patch }
    }

    if (nextPrincipal) {
      return { ...row, principal: false }
    }

    return row
  })
}

function ensureSinglePrincipal<T extends { principal?: boolean }>(rows: T[]) {
  if (rows.length === 0) {
    return rows
  }

  const principalIndex = rows.findIndex((row) => row.principal)
  const effectivePrincipalIndex = principalIndex === -1 ? 0 : principalIndex

  return rows.map((row, index) => ({
    ...row,
    principal: index === effectivePrincipalIndex,
  }))
}

function createEmptyPerfilComercial(): TerceroPerfilComercial {
  return {
    zonaComercialId: null,
    zonaComercialDescripcion: "",
    rubro: "",
    subrubro: "",
    sector: "",
    riesgoCrediticio: "NORMAL",
    condicionCobranza: "",
    saldoMaximoVigente: null,
    vigenciaSaldo: "",
    condicionVenta: "",
    plazoCobro: "",
    facturadorPorDefecto: "",
    minimoFacturaMipymes: null,
    observacionComercial: "",
  }
}

function createCustomerContact(): TerceroContacto {
  return {
    id: createDraftId("contact"),
    nombre: "",
    cargo: "",
    email: "",
    telefono: "",
    sector: "",
    principal: false,
    orden: null,
  }
}

function createCustomerBranch(principal = false): TerceroSucursalEntrega {
  return {
    id: createDraftId("branch"),
    descripcion: "",
    direccion: "",
    localidad: "",
    responsable: "",
    telefono: "",
    horario: "",
    principal,
    orden: null,
  }
}

function addCustomerBranch(rows: TerceroSucursalEntrega[]) {
  if (rows.length >= MAX_CUSTOMER_DELIVERY_ADDRESSES) {
    return rows
  }

  return [...rows, createCustomerBranch(rows.length === 0)]
}

function removeCustomerBranch(rows: TerceroSucursalEntrega[], id: number | string | undefined) {
  return ensureSinglePrincipal(rows.filter((row) => row.id !== id))
}

function createCustomerTransport(): TerceroTransporte {
  return {
    id: createDraftId("transport"),
    transportistaId: null,
    transportistaNombre: "",
    nombre: "",
    servicio: "",
    zona: "",
    frecuencia: "",
    observacion: "",
    activo: true,
    principal: false,
    orden: null,
  }
}

function createCustomerCollectionWindow(): TerceroVentanaCobranza {
  return {
    id: createDraftId("collection"),
    dia: "",
    franja: "",
    canal: "",
    responsable: "",
    principal: false,
    orden: null,
  }
}

function normalizeCustomerSections(sections?: Partial<CustomerSections> | null): CustomerSections {
  return {
    perfilComercial: {
      ...createEmptyPerfilComercial(),
      ...(sections?.perfilComercial ?? {}),
    },
    contactos: (sections?.contactos ?? []).map((contact) => ({
      ...createCustomerContact(),
      ...contact,
      id: contact.id ?? createDraftId("contact"),
    })),
    sucursalesEntrega: ensureSinglePrincipal(
      (sections?.sucursalesEntrega ?? []).map((branch) => ({
        ...createCustomerBranch(),
        ...branch,
        id: branch.id ?? createDraftId("branch"),
      }))
    ),
    transportes: (sections?.transportes ?? []).map((transport) => ({
      ...createCustomerTransport(),
      ...transport,
      id: transport.id ?? createDraftId("transport"),
    })),
    ventanasCobranza: (sections?.ventanasCobranza ?? []).map((window) => ({
      ...createCustomerCollectionWindow(),
      ...window,
      id: window.id ?? createDraftId("collection"),
    })),
  }
}

function sanitizePerfilComercial(profile: TerceroPerfilComercial): TerceroPerfilComercial {
  return {
    terceroId: profile.terceroId,
    zonaComercialId: profile.zonaComercialId ?? null,
    rubro: nullableText(profile.rubro),
    subrubro: nullableText(profile.subrubro),
    sector: nullableText(profile.sector),
    condicionCobranza: nullableText(profile.condicionCobranza),
    riesgoCrediticio: (profile.riesgoCrediticio ?? "NORMAL").trim().toUpperCase(),
    saldoMaximoVigente: profile.saldoMaximoVigente ?? null,
    vigenciaSaldo: nullableText(profile.vigenciaSaldo),
    condicionVenta: nullableText(profile.condicionVenta),
    plazoCobro: nullableText(profile.plazoCobro),
    facturadorPorDefecto: nullableText(profile.facturadorPorDefecto),
    minimoFacturaMipymes: profile.minimoFacturaMipymes ?? null,
    observacionComercial: nullableText(profile.observacionComercial),
  }
}

function sanitizeContact(contact: TerceroContacto): TerceroContacto {
  return {
    ...(typeof contact.id === "number" ? { id: contact.id } : {}),
    nombre: nullableText(contact.nombre),
    cargo: nullableText(contact.cargo),
    email: nullableText(contact.email),
    telefono: nullableText(contact.telefono),
    sector: nullableText(contact.sector),
    principal: Boolean(contact.principal),
    orden: contact.orden ?? null,
  }
}

function sanitizeBranch(branch: TerceroSucursalEntrega): TerceroSucursalEntrega {
  return {
    ...(typeof branch.id === "number" ? { id: branch.id } : {}),
    descripcion: nullableText(branch.descripcion),
    direccion: nullableText(branch.direccion),
    localidad: nullableText(branch.localidad),
    responsable: nullableText(branch.responsable),
    telefono: nullableText(branch.telefono),
    horario: nullableText(branch.horario),
    principal: Boolean(branch.principal),
    orden: branch.orden ?? null,
  }
}

function sanitizeTransport(transport: TerceroTransporte): TerceroTransporte {
  return {
    ...(typeof transport.id === "number" ? { id: transport.id } : {}),
    transportistaId: transport.transportistaId ?? null,
    nombre: nullableText(transport.nombre),
    servicio: nullableText(transport.servicio),
    zona: nullableText(transport.zona),
    frecuencia: nullableText(transport.frecuencia),
    observacion: nullableText(transport.observacion),
    activo: transport.activo ?? true,
    principal: Boolean(transport.principal),
    orden: transport.orden ?? null,
  }
}

function sanitizeCollectionWindow(window: TerceroVentanaCobranza): TerceroVentanaCobranza {
  return {
    ...(typeof window.id === "number" ? { id: window.id } : {}),
    dia: nullableText(window.dia),
    franja: nullableText(window.franja),
    canal: nullableText(window.canal),
    responsable: nullableText(window.responsable),
    principal: Boolean(window.principal),
    orden: window.orden ?? null,
  }
}

function buildUpdatePayload(customerId: number, form: CreateTerceroDto): UpdateTerceroDto {
  return {
    id: customerId,
    razonSocial: normalizeText(form.razonSocial),
    nombreFantasia: nullableText(form.nombreFantasia),
    tipoPersoneria: form.tipoPersoneria ?? null,
    nombre: nullableText(form.nombre),
    apellido: nullableText(form.apellido),
    esEntidadGubernamental: Boolean(form.esEntidadGubernamental),
    claveFiscal: nullableText(form.claveFiscal),
    valorClaveFiscal: nullableText(form.valorClaveFiscal),
    nroDocumento: nullableText(form.nroDocumento),
    condicionIvaId: form.condicionIvaId,
    esCliente: form.esCliente,
    esProveedor: form.esProveedor,
    esEmpleado: form.esEmpleado,
    calle: nullableText(form.calle),
    nro: nullableText(form.nro),
    piso: nullableText(form.piso),
    dpto: nullableText(form.dpto),
    codigoPostal: nullableText(form.codigoPostal),
    paisId: form.paisId ?? null,
    localidadId: form.localidadId ?? null,
    barrioId: form.barrioId ?? null,
    nroIngresosBrutos: nullableText(form.nroIngresosBrutos),
    nroMunicipal: nullableText(form.nroMunicipal),
    telefono: nullableText(form.telefono),
    celular: nullableText(form.celular),
    email: nullableText(form.email),
    web: nullableText(form.web),
    monedaId: form.monedaId ?? null,
    categoriaId: form.categoriaId ?? null,
    categoriaClienteId: form.esCliente ? (form.categoriaClienteId ?? null) : null,
    estadoClienteId: form.esCliente ? (form.estadoClienteId ?? null) : null,
    categoriaProveedorId: form.esProveedor ? (form.categoriaProveedorId ?? null) : null,
    estadoProveedorId: form.esProveedor ? (form.estadoProveedorId ?? null) : null,
    limiteCredito: form.limiteCredito ?? null,
    facturable: form.facturable,
    cobradorId: form.aplicaComisionCobrador ? (form.cobradorId ?? null) : null,
    aplicaComisionCobrador: Boolean(form.aplicaComisionCobrador),
    pctComisionCobrador: form.aplicaComisionCobrador ? form.pctComisionCobrador : 0,
    vendedorId: form.aplicaComisionVendedor ? (form.vendedorId ?? null) : null,
    aplicaComisionVendedor: Boolean(form.aplicaComisionVendedor),
    pctComisionVendedor: form.aplicaComisionVendedor ? form.pctComisionVendedor : 0,
    observacion: nullableText(form.observacion),
    sucursalId: form.sucursalId ?? null,
  }
}

function buildCreatePayload(form: CreateTerceroDto): CreateTerceroDto {
  return {
    legajo: nullableText(form.legajo),
    tipoPersoneria: form.tipoPersoneria ?? "JURIDICA",
    razonSocial: normalizeText(form.razonSocial),
    nombre: nullableText(form.nombre),
    apellido: nullableText(form.apellido),
    nombreFantasia: nullableText(form.nombreFantasia),
    tipoDocumentoId: form.tipoDocumentoId ?? null,
    nroDocumento: nullableText(form.nroDocumento),
    condicionIvaId: form.condicionIvaId,
    esEntidadGubernamental: Boolean(form.esEntidadGubernamental),
    claveFiscal: nullableText(form.claveFiscal),
    valorClaveFiscal: nullableText(form.valorClaveFiscal),
    esCliente: form.esCliente,
    esProveedor: form.esProveedor,
    esEmpleado: form.esEmpleado,
    calle: nullableText(form.calle),
    nro: nullableText(form.nro),
    piso: nullableText(form.piso),
    dpto: nullableText(form.dpto),
    codigoPostal: nullableText(form.codigoPostal),
    paisId: form.paisId ?? null,
    localidadId: form.localidadId ?? null,
    barrioId: form.barrioId ?? null,
    nroIngresosBrutos: nullableText(form.nroIngresosBrutos),
    nroMunicipal: nullableText(form.nroMunicipal),
    telefono: nullableText(form.telefono),
    celular: nullableText(form.celular),
    email: nullableText(form.email),
    web: nullableText(form.web),
    monedaId: form.monedaId ?? null,
    categoriaId: form.categoriaId ?? null,
    categoriaClienteId: form.esCliente ? (form.categoriaClienteId ?? null) : null,
    estadoClienteId: form.esCliente ? (form.estadoClienteId ?? null) : null,
    categoriaProveedorId: form.esProveedor ? (form.categoriaProveedorId ?? null) : null,
    estadoProveedorId: form.esProveedor ? (form.estadoProveedorId ?? null) : null,
    limiteCredito: form.limiteCredito ?? null,
    facturable: form.facturable,
    cobradorId: form.aplicaComisionCobrador ? (form.cobradorId ?? null) : null,
    aplicaComisionCobrador: Boolean(form.aplicaComisionCobrador),
    pctComisionCobrador: form.aplicaComisionCobrador ? form.pctComisionCobrador : 0,
    vendedorId: form.aplicaComisionVendedor ? (form.vendedorId ?? null) : null,
    aplicaComisionVendedor: Boolean(form.aplicaComisionVendedor),
    pctComisionVendedor: form.aplicaComisionVendedor ? form.pctComisionVendedor : 0,
    observacion: nullableText(form.observacion),
    sucursalId: form.sucursalId ?? null,
  }
}

function personeriaLabel(value: TipoPersoneria | null | undefined) {
  if (value === "FISICA") return "Física"
  if (value === "JURIDICA") return "Jurídica"
  return "-"
}

// ─── CustomerForm ─────────────────────────────────────────────────────────────

const EMPTY_FORM: CreateTerceroDto = {
  legajo: null,
  tipoPersoneria: "JURIDICA",
  razonSocial: "",
  nombre: null,
  apellido: null,
  nombreFantasia: null,
  tipoDocumentoId: null,
  nroDocumento: null,
  condicionIvaId: 0,
  esEntidadGubernamental: false,
  claveFiscal: null,
  valorClaveFiscal: null,
  esCliente: true,
  esProveedor: false,
  esEmpleado: false,
  calle: null,
  nro: null,
  piso: null,
  dpto: null,
  codigoPostal: null,
  paisId: null,
  localidadId: null,
  barrioId: null,
  nroIngresosBrutos: null,
  nroMunicipal: null,
  telefono: null,
  celular: null,
  email: null,
  web: null,
  monedaId: null,
  categoriaId: null,
  categoriaClienteId: null,
  estadoClienteId: null,
  categoriaProveedorId: null,
  estadoProveedorId: null,
  limiteCredito: null,
  facturable: true,
  cobradorId: null,
  aplicaComisionCobrador: false,
  pctComisionCobrador: 0,
  vendedorId: null,
  aplicaComisionVendedor: false,
  pctComisionVendedor: 0,
  observacion: null,
  sucursalId: null,
}

function buildCustomerForm(customer: Tercero | null): CreateTerceroDto {
  if (!customer) {
    return { ...EMPTY_FORM }
  }

  return {
    legajo: customer.legajo ?? null,
    tipoPersoneria: customer.tipoPersoneria ?? "JURIDICA",
    razonSocial: customer.razonSocial,
    nombre: customer.nombre ?? null,
    apellido: customer.apellido ?? null,
    nombreFantasia: customer.nombreFantasia,
    tipoDocumentoId: customer.tipoDocumentoId ?? null,
    nroDocumento: customer.nroDocumento,
    condicionIvaId: customer.condicionIvaId,
    esEntidadGubernamental: customer.esEntidadGubernamental ?? false,
    claveFiscal: customer.claveFiscal ?? null,
    valorClaveFiscal: customer.valorClaveFiscal ?? null,
    esCliente: customer.esCliente,
    esProveedor: customer.esProveedor,
    esEmpleado: customer.esEmpleado,
    calle: customer.calle,
    nro: customer.nro,
    piso: customer.piso,
    dpto: customer.dpto,
    codigoPostal: customer.codigoPostal,
    paisId: customer.paisId ?? null,
    localidadId: customer.localidadId,
    barrioId: customer.barrioId,
    nroIngresosBrutos: customer.nroIngresosBrutos,
    nroMunicipal: customer.nroMunicipal,
    telefono: customer.telefono,
    celular: customer.celular,
    email: customer.email,
    web: customer.web,
    monedaId: customer.monedaId,
    categoriaId: customer.categoriaId,
    categoriaClienteId: customer.categoriaClienteId ?? null,
    estadoClienteId: customer.estadoClienteId ?? null,
    categoriaProveedorId: customer.categoriaProveedorId ?? null,
    estadoProveedorId: customer.estadoProveedorId ?? null,
    limiteCredito: customer.limiteCredito,
    facturable: customer.facturable,
    cobradorId: customer.cobradorId,
    aplicaComisionCobrador: customer.aplicaComisionCobrador ?? false,
    pctComisionCobrador: customer.pctComisionCobrador,
    vendedorId: customer.vendedorId,
    aplicaComisionVendedor: customer.aplicaComisionVendedor ?? false,
    pctComisionVendedor: customer.pctComisionVendedor,
    observacion: customer.observacion,
    sucursalId: customer.sucursalId ?? null,
  }
}

interface CustomerFormProps {
  customer: Tercero | null
  customerSections: CustomerSections | null
  onClose: () => void
  onSaved: (customerId: number) => void
  createTercero: (dto: CreateTerceroDto) => Promise<Tercero | null>
  updateTercero: (id: number, dto: UpdateTerceroDto) => Promise<Tercero | null>
  updatePerfilComercial: (id: number, dto: TerceroPerfilComercial) => Promise<boolean>
  updateContactos: (id: number, dto: TerceroContacto[]) => Promise<boolean>
  updateSucursalesEntrega: (id: number, dto: TerceroSucursalEntrega[]) => Promise<boolean>
  updateTransportes: (id: number, dto: TerceroTransporte[]) => Promise<boolean>
  updateVentanasCobranza: (id: number, dto: TerceroVentanaCobranza[]) => Promise<boolean>
}

function CustomerForm({
  customer,
  customerSections,
  onClose,
  onSaved,
  createTercero,
  updateTercero,
  updatePerfilComercial,
  updateContactos,
  updateSucursalesEntrega,
  updateTransportes,
  updateVentanasCobranza,
}: CustomerFormProps) {
  const { condicionesIva, monedas, tiposDocumento, categoriasClientes, estadosClientes } =
    useTercerosConfig()
  const { sucursales } = useSucursales(false)
  const { empleados } = useEmpleados()
  const [tab, setTab] = useState("ficha")
  const [form, setForm] = useState<CreateTerceroDto>(() => buildCustomerForm(customer))
  const [sections, setSections] = useState<CustomerSections>(() =>
    normalizeCustomerSections(customerSections)
  )
  const { paises, localidades, barrios, fetchPaises } = useGeografia({
    autoFetchLocalidades: true,
    localidadId: form.localidadId,
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const set = (k: keyof CreateTerceroDto, v: unknown) => setForm((prev) => ({ ...prev, [k]: v }))

  const str = (v: string) => v || null
  const num = (v: string) => (v ? Number(v) : null)

  useEffect(() => {
    void fetchPaises()
  }, [fetchPaises])

  const updateSections = <K extends keyof CustomerSections>(key: K, value: CustomerSections[K]) => {
    setSections((prev) => ({ ...prev, [key]: value }))
  }

  const updateContact = (id: number | string | undefined, patch: Partial<TerceroContacto>) => {
    updateSections("contactos", withSinglePrincipal(sections.contactos, id, patch))
  }

  const updateBranch = (
    id: number | string | undefined,
    patch: Partial<TerceroSucursalEntrega>
  ) => {
    updateSections("sucursalesEntrega", withSinglePrincipal(sections.sucursalesEntrega, id, patch))
  }

  const updateTransport = (id: number | string | undefined, patch: Partial<TerceroTransporte>) => {
    updateSections("transportes", withSinglePrincipal(sections.transportes, id, patch))
  }

  const updateCollectionWindow = (
    id: number | string | undefined,
    patch: Partial<TerceroVentanaCobranza>
  ) => {
    updateSections("ventanasCobranza", withSinglePrincipal(sections.ventanasCobranza, id, patch))
  }

  const customerCoverage = useMemo(
    () => [
      form.facturable ? "Facturación habilitada" : "Registro no facturable",
      form.condicionIvaId ? "Cobertura fiscal cargada" : "Falta condición fiscal",
      form.limiteCredito !== null ? "Crédito definido" : "Sin límite de crédito",
      sections.contactos.length > 0 ? `${sections.contactos.length} contacto(s)` : "Sin contactos",
      sections.sucursalesEntrega.length > 0
        ? `${sections.sucursalesEntrega.length} domicilio(s) de entrega`
        : "Sin domicilios de entrega",
      sections.transportes.length > 0
        ? `${sections.transportes.length} transporte(s)`
        : "Sin transportes",
      sections.ventanasCobranza.length > 0
        ? `${sections.ventanasCobranza.length} ventana(s) de cobranza`
        : "Sin ventanas de cobranza",
    ],
    [form.condicionIvaId, form.facturable, form.limiteCredito, sections]
  )

  const categoriaClienteDescripcion =
    categoriasClientes.find((item) => item.id === form.categoriaClienteId)?.descripcion ??
    (form.categoriaClienteId ? `Categoría #${form.categoriaClienteId}` : "Sin categoría")

  const estadoClienteDescripcion =
    estadosClientes.find((item) => item.id === form.estadoClienteId)?.descripcion ??
    (form.estadoClienteId ? `Estado #${form.estadoClienteId}` : "Sin estado")

  const vendedorDescripcion =
    empleados.find((item) => item.id === form.vendedorId)?.razonSocial ??
    (form.vendedorId ? `Empleado #${form.vendedorId}` : "Sin vendedor")

  const cobradorDescripcion =
    empleados.find((item) => item.id === form.cobradorId)?.razonSocial ??
    (form.cobradorId ? `Empleado #${form.cobradorId}` : "Sin cobrador")

  const fichaReferencia = [
    {
      label: "Nro. interno",
      value: customer?.nroInterno ? String(customer.nroInterno) : "Se asigna al guardar",
    },
    {
      label: "Fecha alta",
      value: customer?.createdAt
        ? new Date(customer.createdAt).toLocaleDateString("es-AR")
        : "Se registra al crear",
    },
    {
      label: "Categoría",
      value: categoriaClienteDescripcion,
    },
    {
      label: "Estado",
      value: estadoClienteDescripcion,
    },
    {
      label: "Vendedor",
      value: vendedorDescripcion,
    },
    {
      label: "Cobrador",
      value: cobradorDescripcion,
    },
  ]

  const operationalWarnings = useMemo(() => {
    const warnings: string[] = []

    if (!form.esCliente) {
      warnings.push(
        "El rol cliente está desactivado; la ficha no participará del circuito comercial."
      )
    }

    if (form.facturable && !normalizeText(form.nroDocumento)) {
      warnings.push("Conviene completar el documento antes de usar al cliente en facturación.")
    }

    if (
      !normalizeText(form.email) &&
      !normalizeText(form.telefono) &&
      !normalizeText(form.celular)
    ) {
      warnings.push("No hay un canal principal de contacto cargado.")
    }

    if (sections.contactos.length === 0) {
      warnings.push("No hay contactos adicionales para ventas, administración o cobranzas.")
    } else if (!sections.contactos.some((contact) => contact.principal)) {
      warnings.push("Conviene marcar un contacto principal para acelerar la gestión comercial.")
    }

    if (sections.sucursalesEntrega.length === 0) {
      warnings.push("No hay domicilios de entrega cargados.")
    } else if (!sections.sucursalesEntrega.some((branch) => branch.principal)) {
      warnings.push("Conviene marcar un domicilio principal de entrega.")
    }

    if (sections.sucursalesEntrega.length > MAX_CUSTOMER_DELIVERY_ADDRESSES) {
      warnings.push(
        `Solo se permiten ${MAX_CUSTOMER_DELIVERY_ADDRESSES} domicilios de entrega por cliente.`
      )
    }

    if (
      sections.transportes.length > 0 &&
      !sections.transportes.some((transport) => transport.principal)
    ) {
      warnings.push("Hay transportes asociados, pero ninguno quedó marcado como principal.")
    }

    if (
      sections.ventanasCobranza.length > 0 &&
      !sections.ventanasCobranza.some((window) => window.principal)
    ) {
      warnings.push("Hay ventanas de cobranza cargadas, pero ninguna quedó como principal.")
    }

    if (form.facturable && !form.vendedorId) {
      warnings.push("El cliente es facturable, pero todavía no tiene vendedor asignado.")
    }

    if (form.facturable && !form.cobradorId) {
      warnings.push("El cliente es facturable, pero todavía no tiene cobrador asignado.")
    }

    const estadoSeleccionado = estadosClientes.find((item) => item.id === form.estadoClienteId)
    if (estadoSeleccionado?.bloquea) {
      warnings.push(`${estadoSeleccionado.descripcion} bloquea la operatoria comercial.`)
    }

    return warnings
  }, [
    estadosClientes,
    form.celular,
    form.cobradorId,
    form.email,
    form.esCliente,
    form.estadoClienteId,
    form.facturable,
    form.nroDocumento,
    form.telefono,
    form.vendedorId,
    sections.contactos,
    sections.sucursalesEntrega,
    sections.transportes,
    sections.ventanasCobranza,
  ])

  const validate = (): string | null => {
    if (!form.razonSocial.trim()) return "La razón social es requerida"
    if (!form.esCliente && !form.esProveedor && !form.esEmpleado) {
      return "El tercero debe tener al menos un rol activo"
    }
    if ((form.legajo?.length ?? 0) > 20) return "El legajo no puede superar los 20 caracteres"
    if (form.legajo && !/^[A-Za-z0-9-]+$/.test(form.legajo)) {
      return "El legajo solo puede contener letras, números y guiones"
    }
    if (form.razonSocial.length > 200) return "La razón social no puede superar los 200 caracteres"
    if ((form.nombreFantasia?.length ?? 0) > 200) {
      return "El nombre de fantasía no puede superar los 200 caracteres"
    }
    if (!form.condicionIvaId) return "Seleccione una condición IVA"
    if (!form.tipoPersoneria) return "Seleccione el tipo de personería"
    if (form.nroDocumento && !form.tipoDocumentoId) return "Seleccione un tipo de documento"
    if (form.tipoPersoneria === "FISICA") {
      if (!normalizeText(form.nombre)) return "El nombre es obligatorio para persona física"
      if (!normalizeText(form.apellido)) return "El apellido es obligatorio para persona física"
      if (form.esEntidadGubernamental) {
        return "Una persona física no puede marcarse como entidad gubernamental"
      }
    }

    if ((form.nombre?.length ?? 0) > 150) return "El nombre no puede superar los 150 caracteres"
    if ((form.apellido?.length ?? 0) > 150) return "El apellido no puede superar los 150 caracteres"

    if (
      (normalizeText(form.claveFiscal) && !normalizeText(form.valorClaveFiscal)) ||
      (!normalizeText(form.claveFiscal) && normalizeText(form.valorClaveFiscal))
    ) {
      return "Clave fiscal y valor de clave fiscal deben completarse juntos"
    }

    if ((form.claveFiscal?.length ?? 0) > 50)
      return "La clave fiscal no puede superar los 50 caracteres"
    if ((form.valorClaveFiscal?.length ?? 0) > 30) {
      return "El valor de la clave fiscal no puede superar los 30 caracteres"
    }
    if ((form.nroDocumento?.length ?? 0) > 30)
      return "El documento no puede superar los 30 caracteres"
    if ((form.email?.length ?? 0) > 150) return "El email no puede superar los 150 caracteres"
    if ((form.telefono?.length ?? 0) > 30) return "El teléfono no puede superar los 30 caracteres"
    if ((form.celular?.length ?? 0) > 30) return "El celular no puede superar los 30 caracteres"
    if ((form.web?.length ?? 0) > 150) return "La web no puede superar los 150 caracteres"
    if ((form.calle?.length ?? 0) > 150) return "La calle no puede superar los 150 caracteres"
    if ((form.codigoPostal?.length ?? 0) > 10)
      return "El código postal no puede superar los 10 caracteres"
    if ((form.nroIngresosBrutos?.length ?? 0) > 30) {
      return "El nro. de ingresos brutos no puede superar los 30 caracteres"
    }
    if ((form.nroMunicipal?.length ?? 0) > 30) {
      return "El nro. municipal no puede superar los 30 caracteres"
    }
    if (!form.esCliente && (form.categoriaClienteId || form.estadoClienteId)) {
      return "No puede informar categoría o estado de cliente si el rol cliente está desactivado"
    }

    if (sections.sucursalesEntrega.length > MAX_CUSTOMER_DELIVERY_ADDRESSES) {
      return `Solo se permiten ${MAX_CUSTOMER_DELIVERY_ADDRESSES} domicilios de entrega por cliente`
    }

    if (form.aplicaComisionCobrador) {
      if (!form.cobradorId) return "Debe seleccionar un cobrador"
      if (!form.pctComisionCobrador || form.pctComisionCobrador <= 0) {
        return "Debe ingresar un porcentaje de comisión de cobrador válido"
      }
    }

    if (form.aplicaComisionVendedor) {
      if (!form.vendedorId) return "Debe seleccionar un vendedor"
      if (!form.pctComisionVendedor || form.pctComisionVendedor <= 0) {
        return "Debe ingresar un porcentaje de comisión de vendedor válido"
      }
    }

    const condicionIva = condicionesIva.find((item) => item.id === form.condicionIvaId)
    const tipoDocumento = tiposDocumento.find((item) => item.id === form.tipoDocumentoId)
    const condicionIvaLabel = normalizeText(condicionIva?.descripcion).toLowerCase()
    const tipoDocumentoLabel = normalizeText(tipoDocumento?.descripcion).toLowerCase()

    const requiereClaveFiscal = ["responsable inscripto", "exento", "monotributo"].some((entry) =>
      condicionIvaLabel.includes(entry)
    )

    if (
      requiereClaveFiscal &&
      (!normalizeText(form.claveFiscal) || !normalizeText(form.valorClaveFiscal))
    ) {
      return "La condición IVA seleccionada requiere clave fiscal y su valor"
    }

    if (requiereClaveFiscal && !normalizeText(form.nroDocumento)) {
      return "La condición IVA seleccionada requiere documento informado"
    }

    if (
      condicionIvaLabel.includes("consumidor final") &&
      !normalizeText(form.nroDocumento) &&
      !tipoDocumentoLabel.includes("consumidor final")
    ) {
      return "Consumidor final sin documento debe usar el tipo de documento consumidor final"
    }

    if (form.tipoPersoneria === "JURIDICA" && tipoDocumentoLabel.includes("dni")) {
      return "Una persona jurídica no debe usar DNI como tipo de documento"
    }

    return null
  }

  const saveSections = async (customerId: number) => {
    const [profileOk, contactsOk, branchesOk, transportesOk, ventanasOk] = await Promise.all([
      updatePerfilComercial(customerId, sanitizePerfilComercial(sections.perfilComercial)),
      updateContactos(
        customerId,
        sections.contactos.map((contact, index) => sanitizeContact({ ...contact, orden: index }))
      ),
      updateSucursalesEntrega(
        customerId,
        sections.sucursalesEntrega.map((branch, index) =>
          sanitizeBranch({ ...branch, orden: index })
        )
      ),
      updateTransportes(
        customerId,
        sections.transportes.map((transport, index) =>
          sanitizeTransport({ ...transport, orden: index })
        )
      ),
      updateVentanasCobranza(
        customerId,
        sections.ventanasCobranza.map((window, index) =>
          sanitizeCollectionWindow({ ...window, orden: index })
        )
      ),
    ])

    return profileOk && contactsOk && branchesOk && transportesOk && ventanasOk
  }

  const handleSave = async () => {
    const err = validate()
    if (err) {
      setFormError(err)
      return
    }
    setSaving(true)
    setFormError(null)
    const payload = buildCreatePayload(form)
    const savedCustomer = customer
      ? await updateTercero(customer.id, buildUpdatePayload(customer.id, payload))
      : await createTercero(payload)

    if (!savedCustomer) {
      setSaving(false)
      setFormError("No se pudo guardar el cliente")
      return
    }

    const sectionsOk = await saveSections(savedCustomer.id)
    setSaving(false)

    if (!sectionsOk) {
      onSaved(savedCustomer.id)
      return
    }

    onSaved(savedCustomer.id)
  }

  return (
    <div className="space-y-5 overflow-x-hidden">
      <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-4">
        <Card className="min-w-0 border-slate-200 bg-slate-50/80">
          <CardContent className="space-y-1 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Ficha</p>
            <p className="min-w-0 wrap-break-word text-base font-semibold text-slate-900">
              {form.razonSocial || "Nuevo cliente"}
            </p>
            <p className="min-w-0 wrap-break-word text-xs text-slate-600">
              {form.nombreFantasia || "Completá identidad comercial y fiscal"}
            </p>
          </CardContent>
        </Card>
        <Card className="min-w-0 border-emerald-200 bg-emerald-50/80">
          <CardContent className="space-y-1 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-emerald-700">Circuito</p>
            <p className="min-w-0 wrap-break-word text-base font-semibold text-emerald-950">
              {form.facturable ? "Listo para facturar" : "Registro restringido"}
            </p>
            <p className="min-w-0 wrap-break-word text-xs text-emerald-800">
              {formatMoney(form.limiteCredito)}
            </p>
          </CardContent>
        </Card>
        <Card className="min-w-0 border-sky-200 bg-sky-50/80">
          <CardContent className="space-y-1 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-sky-700">Cobertura</p>
            <p className="min-w-0 wrap-break-word text-base font-semibold text-sky-950">
              {sections.contactos.length +
                sections.sucursalesEntrega.length +
                sections.transportes.length}{" "}
              bloques activos
            </p>
            <p className="min-w-0 wrap-break-word text-xs text-sky-800">
              {customerCoverage.join(" · ")}
            </p>
          </CardContent>
        </Card>
        <Card className="min-w-0 border-amber-200 bg-amber-50/80">
          <CardContent className="space-y-1 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-amber-700">Vista integral</p>
            <p className="min-w-0 wrap-break-word text-base font-semibold text-amber-950">
              Ficha comercial completa
            </p>
            <p className="min-w-0 wrap-break-word text-xs text-amber-800">
              La operación, la cobranza y las entregas quedan en una sola lectura, ordenada y clara.
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto w-full min-w-0 gap-2 overflow-x-auto rounded-xl p-1.5 md:grid md:grid-cols-4 md:overflow-visible 2xl:grid-cols-8">
          {[
            { key: "ficha", label: "Ficha" },
            { key: "ubicacion", label: "Ubicación" },
            { key: "fiscal", label: "Fiscal" },
            { key: "comercial", label: "Comercial" },
            { key: "perfil", label: "Perfil" },
            { key: "contactos", label: "Contactos" },
            { key: "entregas", label: "Entregas" },
            { key: "operacion", label: "Operación" },
          ].map((t) => (
            <TabsTrigger
              key={t.key}
              value={t.key}
              className="min-w-33 flex-none px-3 py-2 text-xs capitalize md:min-w-0 md:flex-1"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="ficha" className="mt-4 space-y-4">
          {operationalWarnings.length > 0 ? (
            <Card className="border-amber-200 bg-amber-50/60">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-amber-950">
                  <AlertCircle className="h-4 w-4" /> Pendientes para cerrar la ficha
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 md:grid-cols-2">
                {operationalWarnings.map((warning) => (
                  <div
                    key={warning}
                    className="rounded-lg border border-amber-200 bg-background/80 px-3 py-2 text-sm text-slate-700"
                  >
                    {warning}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-dashed bg-muted/20">
            <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-6">
              {fichaReferencia.map((item) => (
                <div key={item.label} className="min-w-0 rounded-lg border bg-background/80 p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-1 wrap-break-word text-sm font-medium text-foreground">
                    {item.value}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.95fr)]">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Identidad del cliente</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Legajo</Label>
                  <Input
                    placeholder="LEG-0001"
                    value={form.legajo ?? ""}
                    disabled={Boolean(customer)}
                    onChange={(e) => set("legajo", str(e.target.value))}
                  />
                  {customer ? (
                    <p className="text-xs text-muted-foreground">
                      El legajo permanece fijo en la edición actual.
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label>
                    Tipo de personería <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.tipoPersoneria ?? "JURIDICA"}
                    onValueChange={(value: string) =>
                      setForm((prev) => ({
                        ...prev,
                        tipoPersoneria: value as TipoPersoneria,
                        esEntidadGubernamental:
                          value === "FISICA" ? false : (prev.esEntidadGubernamental ?? false),
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar personería" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="JURIDICA">Jurídica</SelectItem>
                      <SelectItem value="FISICA">Física</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.tipoPersoneria === "FISICA" ? (
                  <>
                    <div className="space-y-1.5">
                      <Label>
                        Nombre <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        placeholder="Nombre"
                        value={form.nombre ?? ""}
                        onChange={(e) => set("nombre", str(e.target.value))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>
                        Apellido <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        placeholder="Apellido"
                        value={form.apellido ?? ""}
                        onChange={(e) => set("apellido", str(e.target.value))}
                      />
                    </div>
                  </>
                ) : null}
                <div className="space-y-1.5 md:col-span-2">
                  <Label>
                    Razón social <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="Empresa SA"
                    value={form.razonSocial}
                    onChange={(e) => set("razonSocial", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Nombre de fantasía</Label>
                  <Input
                    placeholder="Nombre comercial visible en ventas"
                    value={form.nombreFantasia ?? ""}
                    onChange={(e) => set("nombreFantasia", str(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email principal</Label>
                  <Input
                    type="email"
                    placeholder="contacto@empresa.com"
                    value={form.email ?? ""}
                    autoComplete="email"
                    onChange={(e) => set("email", str(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Teléfono</Label>
                  <Input
                    placeholder="011-1234-5678"
                    value={form.telefono ?? ""}
                    inputMode="tel"
                    autoComplete="tel"
                    onChange={(e) => set("telefono", str(formatPhoneDisplay(e.target.value)))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Celular</Label>
                  <Input
                    placeholder="11-1234-5678"
                    value={form.celular ?? ""}
                    inputMode="tel"
                    autoComplete="tel-national"
                    onChange={(e) => set("celular", str(formatPhoneDisplay(e.target.value)))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Sitio web</Label>
                  <Input
                    placeholder="https://www.empresa.com"
                    value={form.web ?? ""}
                    onChange={(e) => set("web", str(e.target.value))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Lectura rápida</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-[0.18em]">Personería</p>
                  <p className="mt-1 font-medium text-foreground">
                    {personeriaLabel(form.tipoPersoneria)}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-[0.18em]">Documentación</p>
                  <p className="mt-1 wrap-break-word font-medium text-foreground">
                    {form.nroDocumento || "Sin documento informado"}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-[0.18em]">Canal principal</p>
                  <p className="mt-1 wrap-break-word font-medium text-foreground">
                    {form.email || form.telefono || form.celular || "Sin canal cargado"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {customerCoverage.map((entry) => (
                    <Badge
                      key={entry}
                      variant="outline"
                      className="max-w-full whitespace-normal text-left wrap-break-word"
                    >
                      {entry}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ubicacion" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>País</Label>
              <Select
                value={form.paisId ? String(form.paisId) : "__none__"}
                onValueChange={(value: string) =>
                  set("paisId", value === "__none__" ? null : Number(value))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar país" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin país</SelectItem>
                  {paises.map((pais) => (
                    <SelectItem key={pais.id} value={String(pais.id)}>
                      {pais.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Calle</Label>
              <Input
                placeholder="Av. Corrientes"
                value={form.calle ?? ""}
                onChange={(e) => set("calle", str(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Número</Label>
              <Input
                placeholder="1234"
                value={form.nro ?? ""}
                onChange={(e) => set("nro", str(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Piso</Label>
              <Input
                placeholder="8°"
                value={form.piso ?? ""}
                onChange={(e) => set("piso", str(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Departamento</Label>
              <Input
                placeholder="B"
                value={form.dpto ?? ""}
                onChange={(e) => set("dpto", str(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Código Postal</Label>
              <Input
                placeholder="C1043"
                value={form.codigoPostal ?? ""}
                onChange={(e) => set("codigoPostal", str(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Localidad</Label>
              <Select
                value={form.localidadId ? String(form.localidadId) : "__none__"}
                onValueChange={(v: string) => {
                  const localidadId = v === "__none__" ? null : Number(v)
                  setForm((prev) => ({
                    ...prev,
                    localidadId,
                    barrioId: prev.localidadId === localidadId ? prev.barrioId : null,
                  }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar localidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin localidad</SelectItem>
                  {localidades.map((localidad) => (
                    <SelectItem key={localidad.id} value={String(localidad.id)}>
                      {localidad.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Barrio</Label>
              <Select
                value={form.barrioId ? String(form.barrioId) : "__none__"}
                onValueChange={(v: string) => set("barrioId", v === "__none__" ? null : Number(v))}
                disabled={!form.localidadId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar barrio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin barrio</SelectItem>
                  {barrios.map((barrio) => (
                    <SelectItem key={barrio.id} value={String(barrio.id)}>
                      {barrio.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="fiscal" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tipo de documento</Label>
              <Select
                value={form.tipoDocumentoId ? String(form.tipoDocumentoId) : "__none__"}
                onValueChange={(v: string) =>
                  set("tipoDocumentoId", v === "__none__" ? null : Number(v))
                }
                disabled={Boolean(customer)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin tipo</SelectItem>
                  {tiposDocumento.map((tipoDocumento) => (
                    <SelectItem key={tipoDocumento.id} value={String(tipoDocumento.id)}>
                      {tipoDocumento.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {customer ? (
                <p className="text-xs text-muted-foreground">
                  El tipo de documento no se modifica desde el endpoint de edición actual.
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>Número de documento</Label>
              <Input
                placeholder="30-12345678-9"
                value={form.nroDocumento ?? ""}
                inputMode="numeric"
                onChange={(e) => set("nroDocumento", str(formatTaxDocument(e.target.value)))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Condición IVA <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.condicionIvaId ? String(form.condicionIvaId) : ""}
                onValueChange={(v: string) => set("condicionIvaId", Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {condicionesIva.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nro. Ingresos Brutos</Label>
              <Input
                placeholder="IB-001"
                value={form.nroIngresosBrutos ?? ""}
                onChange={(e) => set("nroIngresosBrutos", str(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nro. Municipal</Label>
              <Input
                placeholder="MUN-001"
                value={form.nroMunicipal ?? ""}
                onChange={(e) => set("nroMunicipal", str(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Clave fiscal</Label>
              <Input
                placeholder="AFIP / API / interno"
                value={form.claveFiscal ?? ""}
                onChange={(e) => set("claveFiscal", str(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Valor clave fiscal</Label>
              <Input
                placeholder="Valor asociado"
                value={form.valorClaveFiscal ?? ""}
                onChange={(e) => set("valorClaveFiscal", str(e.target.value))}
              />
            </div>
            <div className="flex items-center gap-2 pt-1 md:col-span-2">
              <Switch
                id="entidad-gubernamental"
                checked={Boolean(form.esEntidadGubernamental)}
                onCheckedChange={(value: boolean) => set("esEntidadGubernamental", value)}
                disabled={form.tipoPersoneria === "FISICA"}
              />
              <Label htmlFor="entidad-gubernamental">Entidad gubernamental</Label>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="comercial" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Operación comercial</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Moneda</Label>
                <Select
                  value={form.monedaId ? String(form.monedaId) : "__none__"}
                  onValueChange={(v: string) =>
                    set("monedaId", v !== "__none__" ? Number(v) : null)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar moneda" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin moneda</SelectItem>
                    {monedas.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.descripcion} ({m.simbolo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Límite de Crédito</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={form.limiteCredito ?? ""}
                  onChange={(e) =>
                    set("limiteCredito", e.target.value ? parseFloat(e.target.value) : null)
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Categoría cliente</Label>
                <Select
                  value={form.categoriaClienteId ? String(form.categoriaClienteId) : "__none__"}
                  onValueChange={(value: string) =>
                    set("categoriaClienteId", value === "__none__" ? null : Number(value))
                  }
                  disabled={!form.esCliente}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin categoría</SelectItem>
                    {categoriasClientes.map((categoria) => (
                      <SelectItem key={categoria.id} value={String(categoria.id)}>
                        {categoria.descripcion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Estado cliente</Label>
                <Select
                  value={form.estadoClienteId ? String(form.estadoClienteId) : "__none__"}
                  onValueChange={(value: string) =>
                    set("estadoClienteId", value === "__none__" ? null : Number(value))
                  }
                  disabled={!form.esCliente}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin estado</SelectItem>
                    {estadosClientes.map((estado) => (
                      <SelectItem key={estado.id} value={String(estado.id)}>
                        {estado.descripcion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Sucursal facturación</Label>
                <Select
                  value={form.sucursalId ? String(form.sucursalId) : "__none__"}
                  onValueChange={(value: string) =>
                    set("sucursalId", value === "__none__" ? null : Number(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar sucursal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin sucursal</SelectItem>
                    {sucursales.map((sucursal) => (
                      <SelectItem key={sucursal.id} value={String(sucursal.id)}>
                        {sucursal.descripcion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Categoría general</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="ID categoría general"
                  value={form.categoriaId ?? ""}
                  onChange={(e) => set("categoriaId", num(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Vendedor</Label>
                <Select
                  value={form.vendedorId ? String(form.vendedorId) : "__none__"}
                  onValueChange={(value: string) =>
                    set("vendedorId", value === "__none__" ? null : Number(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin vendedor</SelectItem>
                    {empleados.map((empleado) => (
                      <SelectItem key={empleado.id} value={String(empleado.id)}>
                        {(empleado.razonSocial || `Empleado #${empleado.id}`) +
                          (empleado.legajo ? ` · ${empleado.legajo}` : "")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Cobrador</Label>
                <Select
                  value={form.cobradorId ? String(form.cobradorId) : "__none__"}
                  onValueChange={(value: string) =>
                    set("cobradorId", value === "__none__" ? null : Number(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cobrador" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin cobrador</SelectItem>
                    {empleados.map((empleado) => (
                      <SelectItem key={empleado.id} value={String(empleado.id)}>
                        {(empleado.razonSocial || `Empleado #${empleado.id}`) +
                          (empleado.legajo ? ` · ${empleado.legajo}` : "")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>% Comisión Vendedor</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  disabled={!form.aplicaComisionVendedor}
                  value={form.pctComisionVendedor}
                  onChange={(e) => set("pctComisionVendedor", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>% Comisión Cobrador</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  disabled={!form.aplicaComisionCobrador}
                  value={form.pctComisionCobrador}
                  onChange={(e) => set("pctComisionCobrador", parseFloat(e.target.value) || 0)}
                />
              </div>
            </CardContent>
          </Card>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="flex items-center gap-2 rounded-lg border p-3">
              <Switch
                id="facturable"
                checked={form.facturable}
                onCheckedChange={(value: boolean) => set("facturable", value)}
              />
              <Label htmlFor="facturable">Facturable</Label>
            </div>
            <div className="flex items-center gap-2 rounded-lg border p-3">
              <Switch
                id="aplica-comision-vendedor"
                checked={Boolean(form.aplicaComisionVendedor)}
                onCheckedChange={(value: boolean) => set("aplicaComisionVendedor", value)}
              />
              <Label htmlFor="aplica-comision-vendedor">Aplica comisión vendedor</Label>
            </div>
            <div className="flex items-center gap-2 rounded-lg border p-3">
              <Switch
                id="aplica-comision-cobrador"
                checked={Boolean(form.aplicaComisionCobrador)}
                onCheckedChange={(value: boolean) => set("aplicaComisionCobrador", value)}
              />
              <Label htmlFor="aplica-comision-cobrador">Aplica comisión cobrador</Label>
            </div>
          </div>
          {form.estadoClienteId ? (
            <p className="text-xs text-muted-foreground">
              {(() => {
                const estado = estadosClientes.find((item) => item.id === form.estadoClienteId)
                if (!estado) return "Estado cliente seleccionado"
                return estado.bloquea
                  ? `${estado.descripcion}: bloquea operatoria comercial.`
                  : `${estado.descripcion}: no bloquea operatoria comercial.`
              })()}
            </p>
          ) : null}
        </TabsContent>

        <TabsContent value="perfil" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Perfil comercial y segmentación</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              <div className="space-y-1.5">
                <Label>ID zona comercial</Label>
                <Input
                  type="number"
                  min={1}
                  value={sections.perfilComercial.zonaComercialId ?? ""}
                  onChange={(e) =>
                    updateSections("perfilComercial", {
                      ...sections.perfilComercial,
                      zonaComercialId: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Zona comercial</Label>
                <Input
                  value={sections.perfilComercial.zonaComercialDescripcion ?? ""}
                  onChange={(e) =>
                    updateSections("perfilComercial", {
                      ...sections.perfilComercial,
                      zonaComercialDescripcion: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Riesgo crediticio</Label>
                <Select
                  value={sections.perfilComercial.riesgoCrediticio ?? "NORMAL"}
                  onValueChange={(value: string) =>
                    updateSections("perfilComercial", {
                      ...sections.perfilComercial,
                      riesgoCrediticio: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="ALERTA">Alerta</SelectItem>
                    <SelectItem value="BLOQUEADO">Bloqueado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Rubro</Label>
                <Input
                  value={sections.perfilComercial.rubro ?? ""}
                  onChange={(e) =>
                    updateSections("perfilComercial", {
                      ...sections.perfilComercial,
                      rubro: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Subrubro</Label>
                <Input
                  value={sections.perfilComercial.subrubro ?? ""}
                  onChange={(e) =>
                    updateSections("perfilComercial", {
                      ...sections.perfilComercial,
                      subrubro: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sector</Label>
                <Input
                  value={sections.perfilComercial.sector ?? ""}
                  onChange={(e) =>
                    updateSections("perfilComercial", {
                      ...sections.perfilComercial,
                      sector: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Condición de cobranza</Label>
                <Input
                  value={sections.perfilComercial.condicionCobranza ?? ""}
                  onChange={(e) =>
                    updateSections("perfilComercial", {
                      ...sections.perfilComercial,
                      condicionCobranza: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Condición de venta</Label>
                <Input
                  value={sections.perfilComercial.condicionVenta ?? ""}
                  onChange={(e) =>
                    updateSections("perfilComercial", {
                      ...sections.perfilComercial,
                      condicionVenta: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Plazo de cobro</Label>
                <Input
                  value={sections.perfilComercial.plazoCobro ?? ""}
                  onChange={(e) =>
                    updateSections("perfilComercial", {
                      ...sections.perfilComercial,
                      plazoCobro: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Vigencia de saldo</Label>
                <Input
                  value={sections.perfilComercial.vigenciaSaldo ?? ""}
                  onChange={(e) =>
                    updateSections("perfilComercial", {
                      ...sections.perfilComercial,
                      vigenciaSaldo: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Saldo máximo vigente</Label>
                <Input
                  type="number"
                  min={0}
                  value={sections.perfilComercial.saldoMaximoVigente ?? ""}
                  onChange={(e) =>
                    updateSections("perfilComercial", {
                      ...sections.perfilComercial,
                      saldoMaximoVigente: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Facturador por defecto</Label>
                <Input
                  value={sections.perfilComercial.facturadorPorDefecto ?? ""}
                  onChange={(e) =>
                    updateSections("perfilComercial", {
                      ...sections.perfilComercial,
                      facturadorPorDefecto: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Mínimo factura MiPyMEs</Label>
                <Input
                  type="number"
                  min={0}
                  value={sections.perfilComercial.minimoFacturaMipymes ?? ""}
                  onChange={(e) =>
                    updateSections("perfilComercial", {
                      ...sections.perfilComercial,
                      minimoFacturaMipymes: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5 md:col-span-2 2xl:col-span-3">
                <Label>Observación comercial</Label>
                <Textarea
                  className="h-28 resize-none"
                  value={sections.perfilComercial.observacionComercial ?? ""}
                  onChange={(e) =>
                    updateSections("perfilComercial", {
                      ...sections.perfilComercial,
                      observacionComercial: e.target.value,
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contactos" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-col items-start justify-between gap-4 pb-3 sm:flex-row sm:items-center">
              <CardTitle className="text-base">Referentes y canales de contacto</CardTitle>
              <Button
                type="button"
                variant="outline"
                className="w-full bg-transparent sm:w-auto"
                onClick={() =>
                  updateSections("contactos", [...sections.contactos, createCustomerContact()])
                }
              >
                <Plus className="mr-2 h-4 w-4" /> Nuevo contacto
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {sections.contactos.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  Agregá referentes comerciales, administrativos o de cobranza.
                </div>
              ) : null}
              {sections.contactos.length > 1 ? (
                <p className="text-xs text-muted-foreground">
                  Solo un contacto puede quedar marcado como principal.
                </p>
              ) : null}
              {sections.contactos.map((contact) => (
                <div key={contact.id} className="rounded-xl border p-4 space-y-3">
                  <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                    <Input
                      placeholder="Nombre"
                      value={contact.nombre ?? ""}
                      onChange={(e) => updateContact(contact.id, { nombre: e.target.value })}
                    />
                    <Input
                      placeholder="Cargo"
                      value={contact.cargo ?? ""}
                      onChange={(e) => updateContact(contact.id, { cargo: e.target.value })}
                    />
                    <Input
                      placeholder="Sector"
                      value={contact.sector ?? ""}
                      onChange={(e) => updateContact(contact.id, { sector: e.target.value })}
                    />
                    <Input
                      placeholder="Email"
                      value={contact.email ?? ""}
                      inputMode="email"
                      onChange={(e) => updateContact(contact.id, { email: e.target.value })}
                    />
                    <Input
                      placeholder="Teléfono"
                      value={contact.telefono ?? ""}
                      inputMode="tel"
                      onChange={(e) =>
                        updateContact(contact.id, { telefono: formatPhoneDisplay(e.target.value) })
                      }
                    />
                    {contact.principal ? (
                      <Badge variant="secondary" className="w-fit">
                        Contacto principal
                      </Badge>
                    ) : null}
                    <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <Label htmlFor={`contact-principal-${contact.id}`}>Principal</Label>
                      <Switch
                        id={`contact-principal-${contact.id}`}
                        checked={Boolean(contact.principal)}
                        onCheckedChange={(checked: boolean) =>
                          updateContact(contact.id, { principal: checked })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        updateSections(
                          "contactos",
                          sections.contactos.filter((row) => row.id !== contact.id)
                        )
                      }
                    >
                      <X className="mr-2 h-4 w-4" /> Quitar
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entregas" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-col items-start justify-between gap-4 pb-3 sm:flex-row sm:items-center">
              <CardTitle className="text-base">Entregas y sucursales</CardTitle>
              <Button
                type="button"
                variant="outline"
                className="w-full bg-transparent sm:w-auto"
                disabled={sections.sucursalesEntrega.length >= MAX_CUSTOMER_DELIVERY_ADDRESSES}
                onClick={() =>
                  updateSections("sucursalesEntrega", addCustomerBranch(sections.sucursalesEntrega))
                }
              >
                <Plus className="mr-2 h-4 w-4" /> Agregar domicilio
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col gap-1 rounded-lg border border-dashed border-slate-300 bg-slate-50/80 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Podés registrar hasta {MAX_CUSTOMER_DELIVERY_ADDRESSES} domicilios de entrega y
                  uno queda como principal.
                </span>
                <span className="font-medium text-slate-900">
                  {sections.sucursalesEntrega.length} / {MAX_CUSTOMER_DELIVERY_ADDRESSES}
                </span>
              </div>
              {sections.sucursalesEntrega.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  Cargá hasta {MAX_CUSTOMER_DELIVERY_ADDRESSES} domicilios de entrega, con
                  responsable, teléfono y horario.
                </div>
              ) : null}
              {sections.sucursalesEntrega.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  Solo un domicilio de entrega puede quedar como principal.
                </p>
              ) : null}
              {sections.sucursalesEntrega.map((branch) => (
                <div key={branch.id} className="rounded-xl border p-4 space-y-3">
                  <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                    <Input
                      placeholder="Descripción o alias"
                      value={branch.descripcion ?? ""}
                      onChange={(e) => updateBranch(branch.id, { descripcion: e.target.value })}
                    />
                    <Input
                      placeholder="Responsable"
                      value={branch.responsable ?? ""}
                      onChange={(e) => updateBranch(branch.id, { responsable: e.target.value })}
                    />
                    <Input
                      placeholder="Teléfono"
                      value={branch.telefono ?? ""}
                      inputMode="tel"
                      onChange={(e) =>
                        updateBranch(branch.id, { telefono: formatPhoneDisplay(e.target.value) })
                      }
                    />
                    <Input
                      placeholder="Dirección"
                      value={branch.direccion ?? ""}
                      onChange={(e) => updateBranch(branch.id, { direccion: e.target.value })}
                    />
                    <Input
                      placeholder="Localidad"
                      value={branch.localidad ?? ""}
                      onChange={(e) => updateBranch(branch.id, { localidad: e.target.value })}
                    />
                    <Input
                      placeholder="Horario"
                      value={branch.horario ?? ""}
                      onChange={(e) => updateBranch(branch.id, { horario: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      {branch.principal ? (
                        <Badge variant="secondary" className="w-fit">
                          Principal
                        </Badge>
                      ) : null}
                      <Switch
                        checked={Boolean(branch.principal)}
                        onCheckedChange={(checked: boolean) =>
                          updateBranch(branch.id, { principal: checked })
                        }
                      />
                      <Label>Domicilio principal</Label>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() =>
                        updateSections(
                          "sucursalesEntrega",
                          removeCustomerBranch(sections.sucursalesEntrega, branch.id)
                        )
                      }
                    >
                      <X className="mr-2 h-4 w-4" /> Quitar
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operacion" className="mt-4 space-y-4">
          <div className="grid gap-4 2xl:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-col items-start justify-between gap-4 pb-3 sm:flex-row sm:items-center">
                <CardTitle className="text-base">Transportes asociados</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-transparent sm:w-auto"
                  onClick={() =>
                    updateSections("transportes", [
                      ...sections.transportes,
                      createCustomerTransport(),
                    ])
                  }
                >
                  <Plus className="mr-2 h-4 w-4" /> Nuevo transporte
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {sections.transportes.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    Relacioná transportistas, servicios y zonas operativas.
                  </div>
                ) : null}
                {sections.transportes.length > 1 ? (
                  <p className="text-xs text-muted-foreground">
                    Solo un transporte puede quedar como principal.
                  </p>
                ) : null}
                {sections.transportes.map((transport) => (
                  <div key={transport.id} className="rounded-xl border p-4 space-y-3">
                    <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                      <Input
                        type="number"
                        min={1}
                        placeholder="ID transportista"
                        value={transport.transportistaId ?? ""}
                        onChange={(e) =>
                          updateTransport(transport.id, {
                            transportistaId: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                      />
                      <Input
                        placeholder="Nombre"
                        value={transport.nombre ?? ""}
                        onChange={(e) => updateTransport(transport.id, { nombre: e.target.value })}
                      />
                      <Input
                        placeholder="Servicio"
                        value={transport.servicio ?? ""}
                        onChange={(e) =>
                          updateTransport(transport.id, { servicio: e.target.value })
                        }
                      />
                      <Input
                        placeholder="Zona"
                        value={transport.zona ?? ""}
                        onChange={(e) => updateTransport(transport.id, { zona: e.target.value })}
                      />
                      <Input
                        placeholder="Frecuencia"
                        value={transport.frecuencia ?? ""}
                        onChange={(e) =>
                          updateTransport(transport.id, { frecuencia: e.target.value })
                        }
                      />
                      <Textarea
                        placeholder="Observación"
                        value={transport.observacion ?? ""}
                        onChange={(e) =>
                          updateTransport(transport.id, { observacion: e.target.value })
                        }
                        className="resize-none 2xl:col-span-2"
                      />
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-4">
                        {transport.principal ? (
                          <Badge variant="secondary" className="w-fit">
                            Transporte principal
                          </Badge>
                        ) : null}
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={Boolean(transport.activo)}
                            onCheckedChange={(checked: boolean) =>
                              updateTransport(transport.id, { activo: checked })
                            }
                          />
                          <Label>Activo</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={Boolean(transport.principal)}
                            onCheckedChange={(checked: boolean) =>
                              updateTransport(transport.id, { principal: checked })
                            }
                          />
                          <Label>Principal</Label>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={() =>
                          updateSections(
                            "transportes",
                            sections.transportes.filter((row) => row.id !== transport.id)
                          )
                        }
                      >
                        <X className="mr-2 h-4 w-4" /> Quitar
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-col items-start justify-between gap-4 pb-3 sm:flex-row sm:items-center">
                <CardTitle className="text-base">Cobranza, roles y observaciones</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-transparent sm:w-auto"
                  onClick={() =>
                    updateSections("ventanasCobranza", [
                      ...sections.ventanasCobranza,
                      createCustomerCollectionWindow(),
                    ])
                  }
                >
                  <Plus className="mr-2 h-4 w-4" /> Nueva ventana
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 2xl:grid-cols-2">
                  <Card className="border-dashed">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Roles del registro</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="esCliente"
                          checked={form.esCliente}
                          onCheckedChange={(value: boolean) =>
                            setForm((prev) => ({
                              ...prev,
                              esCliente: value,
                              categoriaClienteId: value ? prev.categoriaClienteId : null,
                              estadoClienteId: value ? prev.estadoClienteId : null,
                            }))
                          }
                        />
                        <Label htmlFor="esCliente">Es cliente</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="esProveedor"
                          checked={form.esProveedor}
                          onCheckedChange={(v: boolean) => set("esProveedor", v)}
                        />
                        <Label htmlFor="esProveedor">Es proveedor</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="esEmpleado"
                          checked={form.esEmpleado}
                          onCheckedChange={(v: boolean) => set("esEmpleado", v)}
                        />
                        <Label htmlFor="esEmpleado">Es empleado</Label>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-dashed">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Observación general</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder="Notas operativas, acuerdos de atención o alertas internas..."
                        value={form.observacion ?? ""}
                        onChange={(e) => set("observacion", str(e.target.value))}
                        className="h-32 resize-none"
                      />
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-3">
                  {sections.ventanasCobranza.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      Definí días, franjas y responsables para cobranza y seguimiento.
                    </div>
                  ) : null}
                  {sections.ventanasCobranza.length > 1 ? (
                    <p className="text-xs text-muted-foreground">
                      Solo una ventana de cobranza puede quedar como principal.
                    </p>
                  ) : null}
                  {sections.ventanasCobranza.map((window) => (
                    <div key={window.id} className="rounded-xl border p-4 space-y-3">
                      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
                        <Input
                          placeholder="Día"
                          value={window.dia ?? ""}
                          onChange={(e) =>
                            updateCollectionWindow(window.id, { dia: e.target.value })
                          }
                        />
                        <Input
                          placeholder="Franja"
                          value={window.franja ?? ""}
                          onChange={(e) =>
                            updateCollectionWindow(window.id, { franja: e.target.value })
                          }
                        />
                        <Input
                          placeholder="Canal"
                          value={window.canal ?? ""}
                          onChange={(e) =>
                            updateCollectionWindow(window.id, { canal: e.target.value })
                          }
                        />
                        <Input
                          placeholder="Responsable"
                          value={window.responsable ?? ""}
                          onChange={(e) =>
                            updateCollectionWindow(window.id, { responsable: e.target.value })
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          {window.principal ? (
                            <Badge variant="secondary" className="w-fit">
                              Ventana principal
                            </Badge>
                          ) : null}
                          <Switch
                            checked={Boolean(window.principal)}
                            onCheckedChange={(checked: boolean) =>
                              updateCollectionWindow(window.id, { principal: checked })
                            }
                          />
                          <Label>Ventana principal</Label>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-full sm:w-auto"
                          onClick={() =>
                            updateSections(
                              "ventanasCobranza",
                              sections.ventanasCobranza.filter((row) => row.id !== window.id)
                            )
                          }
                        >
                          <X className="mr-2 h-4 w-4" /> Quitar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {formError && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="h-4 w-4" /> {formError}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 border-t pt-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onClose} className="w-full bg-transparent sm:w-auto">
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          <Check className="h-4 w-4 mr-2" />
          {saving ? "Guardando..." : customer ? "Guardar cambios" : "Crear cliente"}
        </Button>
      </div>
    </div>
  )
}

// ─── Detail Dialog ─────────────────────────────────────────────────────────────

function ClienteDetail({
  customer,
  sections,
  onClose,
  onEdit,
}: {
  customer: Tercero
  sections: CustomerSections
  onClose: () => void
  onEdit: () => void
}) {
  const { monedas } = useTercerosConfig()
  const monedaDescripcion =
    monedas.find((moneda) => moneda.id === customer.monedaId)?.descripcion ??
    (customer.monedaId ? `#${customer.monedaId}` : "-")
  const profile = sections.perfilComercial

  const identificationFields = [
    { label: "Nro. interno", value: customer.nroInterno ? String(customer.nroInterno) : "-" },
    { label: "Legajo", value: customer.legajo ?? "-" },
    { label: "Rol", value: customer.rolDisplay ?? "Cliente" },
    { label: "Personería", value: personeriaLabel(customer.tipoPersoneria) },
    { label: "Razón Social", value: customer.razonSocial },
    { label: "Nombre", value: customer.nombre ?? "-" },
    { label: "Apellido", value: customer.apellido ?? "-" },
    { label: "Nombre Fantasía", value: customer.nombreFantasia ?? "-" },
    { label: "Email", value: customer.email ?? "-" },
    { label: "Teléfono", value: customer.telefono ?? "-" },
    { label: "Celular", value: customer.celular ?? "-" },
    { label: "Sitio Web", value: customer.web ?? "-" },
    { label: "Estado", value: customer.activo ? "Activo" : "Inactivo" },
    { label: "Estado operativo", value: customer.estadoOperativoDescripcion ?? "-" },
    { label: "Fecha Alta", value: new Date(customer.createdAt).toLocaleDateString("es-AR") },
  ]

  const locationFields = [
    { label: "Calle", value: customer.calle ?? "-" },
    { label: "Número", value: customer.nro ?? "-" },
    { label: "Piso", value: customer.piso ?? "-" },
    { label: "Departamento", value: customer.dpto ?? "-" },
    { label: "Código Postal", value: customer.codigoPostal ?? "-" },
    {
      label: "País",
      value: customer.paisDescripcion ?? (customer.paisId ? `#${customer.paisId}` : "-"),
    },
    {
      label: "Localidad",
      value:
        customer.localidadDescripcion ??
        (customer.localidadId ? String(customer.localidadId) : "-"),
    },
    {
      label: "Barrio",
      value: customer.barrioDescripcion ?? (customer.barrioId ? String(customer.barrioId) : "-"),
    },
  ]

  const fiscalFields = [
    {
      label: "Tipo de documento",
      value:
        customer.tipoDocumentoDescripcion ??
        (customer.tipoDocumentoId ? `#${customer.tipoDocumentoId}` : "-"),
    },
    { label: "Número de documento", value: customer.nroDocumento ?? "-" },
    {
      label: "Condición IVA",
      value: customer.condicionIvaDescripcion ?? String(customer.condicionIvaId),
    },
    { label: "Nro. Ingresos Brutos", value: customer.nroIngresosBrutos ?? "-" },
    { label: "Nro. Municipal", value: customer.nroMunicipal ?? "-" },
    { label: "Clave fiscal", value: customer.claveFiscal ?? "-" },
    { label: "Valor clave fiscal", value: customer.valorClaveFiscal ?? "-" },
    {
      label: "Entidad gubernamental",
      value: customer.esEntidadGubernamental ? "Sí" : "No",
    },
  ]

  const commercialFields = [
    { label: "Moneda", value: monedaDescripcion },
    {
      label: "Categoría general",
      value:
        customer.categoriaDescripcion ?? (customer.categoriaId ? `#${customer.categoriaId}` : "-"),
    },
    {
      label: "Categoría cliente",
      value:
        customer.categoriaClienteDescripcion ??
        (customer.categoriaClienteId ? `#${customer.categoriaClienteId}` : "-"),
    },
    {
      label: "Estado cliente",
      value:
        customer.estadoClienteDescripcion ??
        (customer.estadoClienteId ? `#${customer.estadoClienteId}` : "-"),
    },
    {
      label: "Límite de Crédito",
      value: formatMoney(customer.limiteCredito),
    },
    {
      label: "Sucursal facturación",
      value:
        customer.sucursalDescripcion ?? (customer.sucursalId ? `#${customer.sucursalId}` : "-"),
    },
    {
      label: "Cobrador",
      value: customer.cobradorNombre ?? (customer.cobradorId ? `#${customer.cobradorId}` : "-"),
    },
    {
      label: "Aplica comisión cobrador",
      value: customer.aplicaComisionCobrador ? "Sí" : "No",
    },
    { label: "% Comisión Cobrador", value: `${customer.pctComisionCobrador}%` },
    {
      label: "Vendedor",
      value: customer.vendedorNombre ?? (customer.vendedorId ? `#${customer.vendedorId}` : "-"),
    },
    {
      label: "Aplica comisión vendedor",
      value: customer.aplicaComisionVendedor ? "Sí" : "No",
    },
    { label: "% Comisión Vendedor", value: `${customer.pctComisionVendedor}%` },
    { label: "Facturable", value: customer.facturable ? "Sí" : "No" },
    {
      label: "Zona comercial",
      value:
        profile.zonaComercialDescripcion ??
        (profile.zonaComercialId ? `#${profile.zonaComercialId}` : "-"),
    },
    { label: "Rubro", value: profile.rubro ?? "-" },
    { label: "Subrubro", value: profile.subrubro ?? "-" },
    { label: "Sector", value: profile.sector ?? "-" },
    { label: "Riesgo crediticio", value: profile.riesgoCrediticio ?? "-" },
    { label: "Condición cobranza", value: profile.condicionCobranza ?? "-" },
    { label: "Vigencia saldo", value: profile.vigenciaSaldo ?? "-" },
    { label: "Condición venta", value: profile.condicionVenta ?? "-" },
    { label: "Plazo cobro", value: profile.plazoCobro ?? "-" },
    { label: "Facturador por defecto", value: profile.facturadorPorDefecto ?? "-" },
    { label: "Mínimo factura MiPyMEs", value: formatMoney(profile.minimoFacturaMipymes) },
    {
      label: "Saldo máximo vigente",
      value: formatMoney(profile.saldoMaximoVigente),
    },
    {
      label: "Observación",
      value: profile.observacionComercial ?? customer.observacion ?? "-",
    },
  ]

  const contactChannels = [
    {
      label: "Email principal",
      value: customer.email ?? "Sin email cargado",
      icon: Mail,
    },
    {
      label: "Teléfono",
      value: customer.telefono ?? "Sin teléfono cargado",
      icon: Phone,
    },
    {
      label: "Celular",
      value: customer.celular ?? "Sin celular cargado",
      icon: Phone,
    },
    {
      label: "Web",
      value: customer.web ?? "Sin web declarada",
      icon: Building2,
    },
  ]

  const commercialCircuit = useMemo(
    () => [
      customer.facturable ? "Facturable en circuito comercial" : "Registro no facturable",
      formatRelationLabel("Vendedor", customer.vendedorId),
      formatRelationLabel("Cobrador", customer.cobradorId),
      `Comisión vendedor: ${customer.pctComisionVendedor}%`,
      `Comisión cobrador: ${customer.pctComisionCobrador}%`,
      profile.condicionCobranza
        ? `Condición de cobranza: ${profile.condicionCobranza}`
        : "Sin condición de cobranza",
      profile.riesgoCrediticio
        ? `Riesgo crediticio: ${profile.riesgoCrediticio}`
        : "Sin riesgo crediticio",
      customer.nroIngresosBrutos ? `IIBB: ${customer.nroIngresosBrutos}` : "Sin IIBB cargado",
      customer.nroMunicipal ? `Nro. municipal: ${customer.nroMunicipal}` : "Sin nro. municipal",
    ],
    [customer, profile.condicionCobranza, profile.riesgoCrediticio]
  )

  const detailSections = [
    { title: "Identificación", icon: Building2, fields: identificationFields },
    { title: "Ubicación", icon: MapPin, fields: locationFields },
    { title: "Fiscal", icon: ShieldCheck, fields: fiscalFields },
    { title: "Comercial", icon: BriefcaseBusiness, fields: commercialFields },
  ]

  const operationalCoverage = {
    available: [
      customer.email ? "Contacto principal" : null,
      customer.telefono || customer.celular ? "Telefonía visible" : null,
      customer.web ? "Canal web" : null,
      customer.facturable ? "Circuito facturable" : "Registro no facturable",
      customer.vendedorId ? "Vendedor asignado" : null,
      customer.cobradorId ? "Cobrador asignado" : null,
      customer.estadoClienteDescripcion ? "Estado cliente visible" : null,
      customer.sucursalId ? "Sucursal de facturación" : null,
      customer.limiteCredito !== null ? "Límite de crédito" : null,
      customer.condicionIvaDescripcion ? "Cobertura fiscal" : null,
      sections.contactos.length > 0 ? "Contactos adicionales" : null,
      sections.sucursalesEntrega.length > 0 ? "Domicilios de entrega" : null,
      sections.transportes.length > 0 ? "Transportes asociados" : null,
      sections.ventanasCobranza.length > 0 ? "Ventanas de cobranza" : null,
      profile.zonaComercialId || profile.zonaComercialDescripcion || profile.rubro
        ? "Perfil comercial"
        : null,
    ].filter(Boolean) as string[],
    missing: [
      sections.contactos.length === 0 ? "Sin contactos adicionales" : null,
      sections.sucursalesEntrega.length === 0 ? "Sin domicilios de entrega" : null,
      sections.transportes.length === 0 ? "Sin transportes asociados" : null,
      sections.ventanasCobranza.length === 0 ? "Sin ventanas de cobranza" : null,
      !customer.estadoClienteDescripcion ? "Sin estado cliente" : null,
      !profile.zonaComercialId && !profile.zonaComercialDescripcion && !profile.rubro
        ? "Sin perfil comercial"
        : null,
    ].filter(Boolean) as string[],
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        {detailSections.map((section) => {
          const Icon = section.icon
          return (
            <Card key={section.title}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                {section.fields.map((f) => (
                  <div
                    key={f.label}
                    className="p-3 rounded-lg bg-muted/50 col-span-2 sm:col-span-1"
                  >
                    <span className="text-xs text-muted-foreground block mb-1">{f.label}</span>
                    <p className="wrap-break-word font-medium text-sm">{f.value}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )
        })}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Canales de contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {contactChannels.map((channel) => {
              const Icon = channel.icon
              return (
                <div
                  key={channel.label}
                  className="flex items-start gap-3 rounded-lg bg-muted/40 p-3"
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{channel.label}</p>
                    <p className="wrap-break-word text-sm font-medium">{channel.value}</p>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Circuito comercial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {commercialCircuit.map((line) => (
              <div key={line} className="rounded-lg bg-muted/40 px-3 py-2">
                {line}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Contactos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {sections.contactos.length === 0 ? (
              <div className="rounded-lg bg-muted/40 p-3">Sin contactos registrados</div>
            ) : null}
            {sections.contactos.map((contact) => (
              <div key={contact.id} className="rounded-lg bg-muted/40 p-3">
                <p className="font-medium text-foreground">{contact.nombre || "Sin nombre"}</p>
                <p>{contact.cargo || contact.sector || "Sin rol informado"}</p>
                <p>{contact.email || contact.telefono || "Sin canal cargado"}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Domicilios de entrega
              </CardTitle>
              <Badge variant="outline" className="w-fit text-xs">
                {sections.sucursalesEntrega.length} / {MAX_CUSTOMER_DELIVERY_ADDRESSES}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {sections.sucursalesEntrega.length === 0 ? (
              <div className="rounded-lg bg-muted/40 p-3">Sin domicilios registrados</div>
            ) : null}
            {sections.sucursalesEntrega.map((branch) => (
              <div key={branch.id} className="rounded-lg bg-muted/40 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-foreground">
                    {branch.descripcion || "Domicilio sin nombre"}
                  </p>
                  {branch.principal ? (
                    <Badge variant="secondary" className="w-fit">
                      Principal
                    </Badge>
                  ) : null}
                </div>
                <p>{branch.direccion || "Sin dirección"}</p>
                <p>{branch.localidad || "Sin localidad"}</p>
                <p>{branch.horario || "Sin horario"}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-4 w-4" /> Transportes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {sections.transportes.length === 0 ? (
              <div className="rounded-lg bg-muted/40 p-3">Sin transportes registrados</div>
            ) : null}
            {sections.transportes.map((transport) => (
              <div key={transport.id} className="rounded-lg bg-muted/40 p-3">
                <p className="font-medium text-foreground">
                  {transport.nombre || "Transporte sin nombre"}
                </p>
                <p>{transport.servicio || "Sin servicio"}</p>
                <p>{transport.zona || "Sin zona"}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock3 className="h-4 w-4" /> Cobranza y segmentación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="font-medium text-foreground">
                {profile.zonaComercialDescripcion ??
                  (profile.zonaComercialId ? `Zona #${profile.zonaComercialId}` : "Sin zona")}
              </p>
              <p>
                {profile.rubro || "Sin rubro"} · {profile.subrubro || "Sin subrubro"}
              </p>
              <p>{profile.sector || "Sin sector"}</p>
              <p>{profile.condicionCobranza || "Sin condición de cobranza"}</p>
            </div>
            {sections.ventanasCobranza.length === 0 ? (
              <div className="rounded-lg bg-muted/40 p-3">Sin ventanas de cobranza</div>
            ) : null}
            {sections.ventanasCobranza.map((window) => (
              <div key={window.id} className="rounded-lg bg-muted/40 p-3">
                <p className="font-medium text-foreground">{window.dia || "Sin día"}</p>
                <p>{window.franja || "Sin franja"}</p>
                <p>{window.canal || "Sin canal"}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cobertura operativa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium">Hoy cubierto</p>
            <div className="flex flex-wrap gap-2">
              {operationalCoverage.available.map((entry) => (
                <Badge key={entry} variant="secondary">
                  {entry}
                </Badge>
              ))}
            </div>
          </div>
          {operationalCoverage.missing.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-medium">Pendiente de carga</p>
              <div className="flex flex-wrap gap-2">
                {operationalCoverage.missing.map((entry) => (
                  <Badge key={entry} variant="outline">
                    {entry}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
      <div className="flex gap-2 flex-wrap pt-1">
        {customer.esCliente && <Badge variant="outline">Cliente</Badge>}
        {customer.esProveedor && <Badge variant="outline">Proveedor</Badge>}
        {customer.esEmpleado && <Badge variant="outline">Empleado</Badge>}
      </div>
      <DialogFooter className="mt-2 gap-2">
        <Button variant="outline" onClick={onClose} className="w-full bg-transparent sm:w-auto">
          Cerrar
        </Button>
        <Button onClick={onEdit} className="w-full sm:w-auto">
          <Edit className="h-4 w-4 mr-2" /> Editar ficha completa
        </Button>
      </DialogFooter>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ClientesPage() {
  const [soloActivosFilter, setSoloActivosFilter] = useState<"all" | "active">("all")
  const [condicionIvaFilter, setCondicionIvaFilter] = useState<number | null>(null)
  const [categoriaClienteFilter, setCategoriaClienteFilter] = useState<number | null>(null)
  const [estadoClienteFilter, setEstadoClienteFilter] = useState<number | null>(null)
  const [sucursalFilter, setSucursalFilter] = useState<number | null>(null)
  const { condicionesIva, categoriasClientes, estadosClientes } = useTercerosConfig()
  const { sucursales } = useSucursales(false)
  const {
    terceros,
    loading,
    error,
    totalCount,
    totalPages,
    page,
    setPage,
    search,
    setSearch,
    createTercero,
    updateTercero,
    deleteTercero,
    getTerceroById,
    getPerfilComercial,
    updatePerfilComercial,
    getContactos,
    updateContactos,
    getSucursalesEntrega,
    updateSucursalesEntrega,
    getTransportes,
    updateTransportes,
    getVentanasCobranza,
    updateVentanasCobranza,
    refetch,
  } = useTerceros({
    soloActivos: soloActivosFilter === "active",
    condicionIvaId: condicionIvaFilter,
    categoriaClienteId: categoriaClienteFilter,
    estadoClienteId: estadoClienteFilter,
    sucursalId: sucursalFilter,
  })

  const [debouncedSearch, setDebouncedSearch] = useState(search)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    setDebouncedSearch(search)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [
    categoriaClienteFilter,
    condicionIvaFilter,
    estadoClienteFilter,
    soloActivosFilter,
    setPage,
    sucursalFilter,
  ])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleSearch = (val: string) => {
    setDebouncedSearch(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setSearch(val), 400)
  }

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Tercero | null>(null)
  const [editingCustomer, setEditingCustomer] = useState<Tercero | null>(null)
  const [editingCustomerSections, setEditingCustomerSections] = useState<CustomerSections | null>(
    null
  )
  const [deleting, setDeleting] = useState(false)
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<Tercero | null>(null)
  const [selectedCustomerSections, setSelectedCustomerSections] = useState<CustomerSections | null>(
    null
  )
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [formLoadError, setFormLoadError] = useState<string | null>(null)

  const loadCustomerSnapshot = async (customerId: number) => {
    setDetailLoading(true)
    setDetailError(null)
    try {
      const [detail, perfilComercial, contactos, sucursalesEntrega, transportes, ventanasCobranza] =
        await Promise.all([
          getTerceroById(customerId),
          getPerfilComercial(customerId),
          getContactos(customerId),
          getSucursalesEntrega(customerId),
          getTransportes(customerId),
          getVentanasCobranza(customerId),
        ])

      setSelectedCustomerDetail(detail)
      setSelectedCustomerSections(
        normalizeCustomerSections({
          perfilComercial,
          contactos,
          sucursalesEntrega,
          transportes,
          ventanasCobranza,
        })
      )
      setSelectedCustomer(detail)
      return detail
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error al cargar el cliente"
      setDetailError(message)
      setSelectedCustomerDetail(null)
      setSelectedCustomerSections(null)
      return null
    } finally {
      setDetailLoading(false)
    }
  }

  const handleViewDetail = (c: Tercero) => {
    setSelectedCustomer(c)
    setSelectedCustomerDetail(null)
    setSelectedCustomerSections(null)
    setIsDetailOpen(true)
    void loadCustomerSnapshot(c.id)
  }

  const handleEdit = async (c: Tercero) => {
    setFormLoading(true)
    setFormLoadError(null)
    setEditingCustomer(c)
    setEditingCustomerSections(normalizeCustomerSections(null))
    setIsFormOpen(true)
    try {
      const [detail, perfilComercial, contactos, sucursalesEntrega, transportes, ventanasCobranza] =
        await Promise.all([
          getTerceroById(c.id),
          getPerfilComercial(c.id),
          getContactos(c.id),
          getSucursalesEntrega(c.id),
          getTransportes(c.id),
          getVentanasCobranza(c.id),
        ])

      setEditingCustomer(detail)
      setEditingCustomerSections(
        normalizeCustomerSections({
          perfilComercial,
          contactos,
          sucursalesEntrega,
          transportes,
          ventanasCobranza,
        })
      )
    } catch (e) {
      setFormLoadError(e instanceof Error ? e.message : "Error al cargar cliente para edición")
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteConfirm = (c: Tercero) => {
    setSelectedCustomer(c)
    setIsDeleteOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedCustomer) return
    setDeleting(true)
    const ok = await deleteTercero(selectedCustomer.id)
    setDeleting(false)
    if (!ok) return

    setIsDeleteOpen(false)
    setIsDetailOpen(false)
    refetch()
  }

  const handleSaved = (customerId: number) => {
    setIsFormOpen(false)
    setEditingCustomer(null)
    setEditingCustomerSections(null)
    void refetch().then(() => {
      if (selectedCustomer?.id === customerId || selectedCustomerDetail?.id === customerId) {
        void loadCustomerSnapshot(customerId)
      }
    })
  }

  useEffect(() => {
    if (selectedCustomer) {
      const nextSelected = terceros.find((customer) => customer.id === selectedCustomer.id)

      if (!nextSelected) {
        setSelectedCustomer(null)
        setSelectedCustomerDetail(null)
        setSelectedCustomerSections(null)
        setIsDetailOpen(false)
        setIsDeleteOpen(false)
      } else if (nextSelected !== selectedCustomer) {
        setSelectedCustomer(nextSelected)
      }
    }

    if (editingCustomer) {
      const nextEditing = terceros.find((customer) => customer.id === editingCustomer.id)

      if (!nextEditing) {
        setEditingCustomer(null)
        setEditingCustomerSections(null)
        setIsFormOpen(false)
      } else if (nextEditing !== editingCustomer) {
        setEditingCustomer(nextEditing)
      }
    }
  }, [editingCustomer, selectedCustomer, terceros])

  const customerSummary = useMemo(() => {
    const facturables = terceros.filter((customer) => customer.facturable).length
    const conLimite = terceros.filter((customer) => customer.limiteCredito !== null).length
    const conVendedor = terceros.filter((customer) => customer.vendedorId !== null).length
    const conCobrador = terceros.filter((customer) => customer.cobradorId !== null).length
    const conContacto = terceros.filter((customer) =>
      Boolean(customer.email || customer.telefono || customer.celular)
    ).length
    const conWeb = terceros.filter((customer) => Boolean(customer.web)).length
    const conDocumento = terceros.filter((customer) => Boolean(customer.nroDocumento)).length
    const conClaveFiscal = terceros.filter((customer) =>
      Boolean(customer.claveFiscal && customer.valorClaveFiscal)
    ).length
    const bloqueados = terceros.filter(
      (customer) => customer.estadoClienteBloquea || customer.estadoOperativoBloquea
    ).length

    const destacado = [...terceros]
      .sort((left, right) => {
        const rightScore =
          (right.limiteCredito ?? 0) +
          (right.facturable ? 1000000 : 0) +
          (right.vendedorId ? 500000 : 0)
        const leftScore =
          (left.limiteCredito ?? 0) +
          (left.facturable ? 1000000 : 0) +
          (left.vendedorId ? 500000 : 0)
        return rightScore - leftScore
      })
      .at(0)

    return {
      facturables,
      conLimite,
      conVendedor,
      conCobrador,
      conContacto,
      conWeb,
      conDocumento,
      conClaveFiscal,
      bloqueados,
      destacado,
    }
  }, [terceros])

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Ficha comercial de clientes con identidad, crédito, contactos, entregas y cobranza.
          </p>
        </div>
        <Button
          className="w-full sm:w-auto"
          onClick={() => {
            setEditingCustomer(null)
            setEditingCustomerSections(normalizeCustomerSections(null))
            setFormLoadError(null)
            setIsFormOpen(true)
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo cliente
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {[
          {
            label: "Total Clientes",
            value: totalCount,
            color: "",
            hint: "total informado por la API",
          },
          {
            label: "Activos en página",
            value: terceros.filter((c) => c.activo).length,
            color: "text-green-600",
            hint: "solo registros visibles",
          },
          {
            label: "Inactivos en página",
            value: terceros.filter((c) => !c.activo).length,
            color: "text-gray-500",
            hint: "solo registros visibles",
          },
          {
            label: "Facturables en página",
            value: customerSummary.facturables,
            color: "text-blue-600",
            hint: "aptos para circuito comercial",
          },
          {
            label: "Con límite visible",
            value: customerSummary.conLimite,
            color: "text-emerald-600",
            hint: "crédito configurado en la página",
          },
          {
            label: "Con vendedor",
            value: customerSummary.conVendedor,
            color: "text-amber-600",
            hint: "asignación comercial visible",
          },
          {
            label: "Con contacto cargado",
            value: customerSummary.conContacto,
            color: "text-violet-600",
            hint: "email, teléfono o celular",
          },
          {
            label: "Con documento",
            value: customerSummary.conDocumento,
            color: "text-fuchsia-600",
            hint: "documento visible en la página",
          },
          {
            label: "Con clave fiscal",
            value: customerSummary.conClaveFiscal,
            color: "text-cyan-600",
            hint: "clave fiscal y valor informados",
          },
          {
            label: "Con bloqueo operativo",
            value: customerSummary.bloqueados,
            color: "text-rose-600",
            hint: "estado cliente u operativo bloqueante",
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {!loading && !error && (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resumen comercial rápido</CardTitle>
              <CardTitle className="text-sm font-normal text-muted-foreground">
                Lectura compacta del frente comercial visible sin abrir la ficha completa.
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-3 text-sm">
                  <p className="text-muted-foreground">Facturables</p>
                  <p className="mt-1 font-semibold">{customerSummary.facturables} visibles</p>
                </div>
                <div className="rounded-lg border p-3 text-sm">
                  <p className="text-muted-foreground">Con crédito</p>
                  <p className="mt-1 font-semibold">{customerSummary.conLimite} con límite</p>
                </div>
                <div className="rounded-lg border p-3 text-sm">
                  <p className="text-muted-foreground">Vendedor asignado</p>
                  <p className="mt-1 font-semibold">{customerSummary.conVendedor} registros</p>
                </div>
                <div className="rounded-lg border p-3 text-sm">
                  <p className="text-muted-foreground">Cobrador asignado</p>
                  <p className="mt-1 font-semibold">{customerSummary.conCobrador} registros</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Cobertura de contacto</CardTitle>
              <CardTitle className="text-sm font-normal text-muted-foreground">
                Lectura rápida de identificación y canales visibles en la página actual.
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {customerSummary.destacado ? (
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Cliente comercial destacado</p>
                  <p className="mt-1 text-base font-semibold">
                    {customerSummary.destacado.razonSocial}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {customerSummary.destacado.facturable ? "Facturable" : "No facturable"}
                    </Badge>
                    <Badge variant="outline">
                      {formatMoney(customerSummary.destacado.limiteCredito)}
                    </Badge>
                    <Badge variant="outline">
                      {customerSummary.destacado.email ? "Con email" : "Sin email"}
                    </Badge>
                    <Badge variant="outline">
                      {customerSummary.destacado.web ? "Con web" : "Sin web"}
                    </Badge>
                  </div>
                </div>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-3 text-sm">
                  <p className="text-muted-foreground">Con algún canal</p>
                  <p className="mt-1 font-semibold">{customerSummary.conContacto} visibles</p>
                </div>
                <div className="rounded-lg border p-3 text-sm">
                  <p className="text-muted-foreground">Con web</p>
                  <p className="mt-1 font-semibold">{customerSummary.conWeb} visibles</p>
                </div>
                <div className="rounded-lg border p-3 text-sm">
                  <p className="text-muted-foreground">Con documento</p>
                  <p className="mt-1 font-semibold">{customerSummary.conDocumento} clientes</p>
                </div>
                <div className="rounded-lg border p-3 text-sm">
                  <p className="text-muted-foreground">Con clave fiscal</p>
                  <p className="mt-1 font-semibold">{customerSummary.conClaveFiscal} clientes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(180px,1fr))]">
            <div className="space-y-1.5 xl:col-span-1">
              <Label className="text-xs text-muted-foreground">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por razón social o CUIT..."
                  value={debouncedSearch}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Activos</Label>
              <Select
                value={soloActivosFilter}
                onValueChange={(value: string) => setSoloActivosFilter(value as "all" | "active")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Solo activos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Condición IVA</Label>
              <Select
                value={condicionIvaFilter ? String(condicionIvaFilter) : "__none__"}
                onValueChange={(value: string) =>
                  setCondicionIvaFilter(value === "__none__" ? null : Number(value))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Todas</SelectItem>
                  {condicionesIva.map((condicion) => (
                    <SelectItem key={condicion.id} value={String(condicion.id)}>
                      {condicion.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Categoría cliente</Label>
              <Select
                value={categoriaClienteFilter ? String(categoriaClienteFilter) : "__none__"}
                onValueChange={(value: string) =>
                  setCategoriaClienteFilter(value === "__none__" ? null : Number(value))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Todas</SelectItem>
                  {categoriasClientes.map((categoria) => (
                    <SelectItem key={categoria.id} value={String(categoria.id)}>
                      {categoria.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Estado cliente</Label>
              <Select
                value={estadoClienteFilter ? String(estadoClienteFilter) : "__none__"}
                onValueChange={(value: string) =>
                  setEstadoClienteFilter(value === "__none__" ? null : Number(value))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Todos</SelectItem>
                  {estadosClientes.map((estado) => (
                    <SelectItem key={estado.id} value={String(estado.id)}>
                      {estado.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Sucursal facturación</Label>
                <Select
                  value={sucursalFilter ? String(sucursalFilter) : "__none__"}
                  onValueChange={(value: string) =>
                    setSucursalFilter(value === "__none__" ? null : Number(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Todas</SelectItem>
                    {sucursales.map((sucursal) => (
                      <SelectItem key={sucursal.id} value={String(sucursal.id)}>
                        {sucursal.descripcion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-xl border bg-muted/20 px-4 py-3 text-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Vista actual
                </p>
                <p className="mt-1 font-semibold text-foreground">
                  {terceros.length} visibles en esta página
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {totalCount} clientes encontrados en total
                </p>
              </div>
              <div className="rounded-xl border bg-muted/20 px-4 py-3 text-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Lectura rápida
                </p>
                <p className="mt-1 font-semibold text-foreground">
                  {page} / {totalPages || 1} páginas
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Ajustá filtros antes de bajar a la tabla
                </p>
              </div>
            </div>
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-start lg:justify-end">
              {debouncedSearch && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full bg-transparent sm:w-auto"
                  onClick={() => {
                    setDebouncedSearch("")
                    setSearch("")
                  }}
                >
                  <X className="h-3 w-3 mr-1" /> Limpiar búsqueda
                </Button>
              )}
              {(soloActivosFilter !== "all" ||
                condicionIvaFilter ||
                categoriaClienteFilter ||
                estadoClienteFilter ||
                sucursalFilter) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full bg-transparent sm:w-auto"
                  onClick={() => {
                    setSoloActivosFilter("all")
                    setCondicionIvaFilter(null)
                    setCategoriaClienteFilter(null)
                    setEstadoClienteFilter(null)
                    setSucursalFilter(null)
                  }}
                >
                  Limpiar filtros
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full bg-transparent sm:w-auto"
                onClick={refetch}
              >
                <RefreshCw className="mr-2 h-3.5 w-3.5" /> Refrescar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent className="pt-0">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Cargando clientes...</span>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center gap-3 py-12">
              <div className="flex items-center gap-2 text-red-500">
                <AlertCircle className="h-5 w-5" />
                <p className="text-sm font-medium">
                  {error.includes("fetch") || error.includes("network") || error.includes("Failed")
                    ? `No se pudo conectar con el servidor. Verificá que el backend esté disponible en ${API_BASE_URL}.`
                    : error}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={refetch}>
                <RefreshCw className="h-4 w-4 mr-2" /> Reintentar
              </Button>
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="space-y-3 lg:hidden">
                {terceros.length === 0 ? (
                  <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                    No se encontraron clientes
                  </div>
                ) : (
                  terceros.map((customer) => (
                    <Card
                      key={customer.id}
                      className="cursor-pointer border-border/80"
                      onClick={() => handleViewDetail(customer)}
                    >
                      <CardContent className="space-y-4 p-4">
                        <div className="flex flex-col gap-3">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-semibold leading-tight">
                                {customer.razonSocial}
                              </h3>
                              {activoBadge(customer.activo)}
                            </div>
                            {customer.nombreFantasia ? (
                              <p className="text-xs text-muted-foreground">
                                {customer.nombreFantasia}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {customer.estadoClienteDescripcion ? (
                              <Badge
                                variant="outline"
                                className={
                                  customer.estadoClienteBloquea ? "border-red-200 text-red-600" : ""
                                }
                              >
                                {customer.estadoClienteDescripcion}
                              </Badge>
                            ) : null}
                            {customer.estadoOperativoDescripcion ? (
                              <Badge
                                variant="outline"
                                className={
                                  customer.estadoOperativoBloquea
                                    ? "border-red-200 text-red-600"
                                    : ""
                                }
                              >
                                {customer.estadoOperativoDescripcion}
                              </Badge>
                            ) : null}
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-lg bg-muted/40 p-3">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                              Legajo
                            </p>
                            <p className="mt-1 font-mono text-sm">{customer.legajo ?? "-"}</p>
                          </div>
                          <div className="rounded-lg bg-muted/40 p-3">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                              CUIT/CUIL
                            </p>
                            <p className="mt-1 font-mono text-sm">{customer.nroDocumento ?? "-"}</p>
                          </div>
                          <div className="rounded-lg bg-muted/40 p-3">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                              Condición IVA
                            </p>
                            <p className="mt-1 text-sm">
                              {customer.condicionIvaDescripcion ?? `IVA ${customer.condicionIvaId}`}
                            </p>
                          </div>
                          <div className="rounded-lg bg-muted/40 p-3">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                              Localidad
                            </p>
                            <p className="mt-1 text-sm">{customer.localidadDescripcion ?? "-"}</p>
                          </div>
                          <div className="rounded-lg bg-muted/40 p-3 sm:col-span-2">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                              Límite de crédito
                            </p>
                            <p className="mt-1 text-sm font-medium">
                              {customer.limiteCredito !== null
                                ? "$" + customer.limiteCredito.toLocaleString("es-AR")
                                : "Sin límite"}
                            </p>
                          </div>
                        </div>

                        <div
                          className="grid grid-cols-3 gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => handleViewDetail(customer)}
                          >
                            <Eye className="mr-2 h-3.5 w-3.5" /> Ver
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => handleEdit(customer)}
                          >
                            <Edit className="mr-2 h-3.5 w-3.5" /> Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-destructive"
                            onClick={() => handleDeleteConfirm(customer)}
                          >
                            <X className="mr-2 h-3.5 w-3.5" /> Baja
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              <div className="hidden lg:block">
                <Table className="min-w-240">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Legajo</TableHead>
                      <TableHead>Razón Social</TableHead>
                      <TableHead>CUIT/CUIL</TableHead>
                      <TableHead>Condición IVA</TableHead>
                      <TableHead>Estado cliente</TableHead>
                      <TableHead>Localidad</TableHead>
                      <TableHead>Límite Crédito</TableHead>
                      <TableHead>Operativo</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {terceros.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                          No se encontraron clientes
                        </TableCell>
                      </TableRow>
                    ) : (
                      terceros.map((customer) => (
                        <TableRow
                          key={customer.id}
                          className="cursor-pointer hover:bg-muted/40"
                          onClick={() => handleViewDetail(customer)}
                        >
                          <TableCell className="font-mono text-xs">
                            {customer.legajo ?? "-"}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-sm">{customer.razonSocial}</div>
                            {customer.nombreFantasia && (
                              <div className="text-xs text-muted-foreground">
                                {customer.nombreFantasia}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {customer.nroDocumento ?? "-"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {customer.condicionIvaDescripcion ?? `IVA ${customer.condicionIvaId}`}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="flex flex-wrap gap-1">
                              {customer.estadoClienteDescripcion ? (
                                <Badge
                                  variant="outline"
                                  className={
                                    customer.estadoClienteBloquea
                                      ? "border-red-200 text-red-600"
                                      : ""
                                  }
                                >
                                  {customer.estadoClienteDescripcion}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            {customer.localidadDescripcion ?? "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {customer.limiteCredito !== null ? (
                              "$" + customer.limiteCredito.toLocaleString("es-AR")
                            ) : (
                              <span className="text-muted-foreground">Sin límite</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {activoBadge(customer.activo)}
                              {customer.estadoOperativoDescripcion ? (
                                <Badge
                                  variant="outline"
                                  className={
                                    customer.estadoOperativoBloquea
                                      ? "border-red-200 text-red-600"
                                      : ""
                                  }
                                >
                                  {customer.estadoOperativoDescripcion}
                                </Badge>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleViewDetail(customer)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleEdit(customer)}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={() => handleDeleteConfirm(customer)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    Página {page} de {totalPages}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:flex">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" /> Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={page >= totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      Siguiente <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-h-[92vh] w-[calc(100vw-1rem)] max-w-full overflow-x-hidden overflow-y-auto px-4 py-5 sm:w-[calc(100vw-2rem)] sm:max-w-4xl sm:px-6 sm:py-6 lg:max-w-5xl xl:max-w-6xl xl:px-8">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 flex-wrap">
              <span>{selectedCustomer?.razonSocial}</span>
              {selectedCustomer && activoBadge(selectedCustomer.activo)}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {selectedCustomer?.nroDocumento}
              {selectedCustomer?.condicionIvaDescripcion
                ? " · " + selectedCustomer.condicionIvaDescripcion
                : ""}
            </p>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span className="ml-2">Cargando ficha del cliente...</span>
            </div>
          ) : detailError ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <div className="flex items-center gap-2 text-red-500">
                <AlertCircle className="h-5 w-5" />
                <p className="text-sm font-medium">{detailError}</p>
              </div>
              {selectedCustomer ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void loadCustomerSnapshot(selectedCustomer.id)}
                >
                  <RefreshCw className="h-4 w-4 mr-2" /> Reintentar
                </Button>
              ) : null}
            </div>
          ) : selectedCustomerDetail && selectedCustomerSections ? (
            <ClienteDetail
              customer={selectedCustomerDetail}
              sections={selectedCustomerSections}
              onClose={() => setIsDetailOpen(false)}
              onEdit={() => {
                setIsDetailOpen(false)
                void handleEdit(selectedCustomerDetail)
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[94vh] w-[calc(100vw-1rem)] max-w-full overflow-x-hidden overflow-y-auto px-4 py-5 sm:w-[calc(100vw-2rem)] sm:max-w-5xl sm:px-6 sm:py-6 lg:max-w-6xl xl:max-w-7xl xl:px-8">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? "Editar: " + editingCustomer.razonSocial : "Nuevo cliente"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Ficha completa de ventas con identidad, fiscal, perfil comercial, contactos, entregas,
              transportes y cobranza.
            </p>
          </DialogHeader>
          {formLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span className="ml-2">Cargando cliente para edición...</span>
            </div>
          ) : (
            <>
              {formLoadError ? (
                <p className="mb-3 flex items-center gap-2 text-sm text-red-500">
                  <AlertCircle className="h-4 w-4" /> {formLoadError}
                </p>
              ) : null}
              <CustomerForm
                key={`${editingCustomer?.id ?? "new-customer"}-${isFormOpen ? "open" : "closed"}`}
                customer={editingCustomer}
                customerSections={editingCustomerSections}
                onClose={() => setIsFormOpen(false)}
                onSaved={handleSaved}
                createTercero={createTercero}
                updateTercero={updateTercero}
                updatePerfilComercial={updatePerfilComercial}
                updateContactos={updateContactos}
                updateSucursalesEntrega={updateSucursalesEntrega}
                updateTransportes={updateTransportes}
                updateVentanasCobranza={updateVentanasCobranza}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-sm sm:w-full">
          <DialogHeader>
            <DialogTitle>¿Desactivar este cliente?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            El cliente <strong>{selectedCustomer?.razonSocial}</strong> será desactivado.
          </p>
          <DialogFooter className="gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              className="bg-transparent"
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Desactivando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
