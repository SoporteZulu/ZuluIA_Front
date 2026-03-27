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
import { useTerceros, useTercerosConfig } from "@/lib/hooks/useTerceros"
import { useGeografia } from "@/lib/hooks/useGeografia"
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

function createCustomerBranch(): TerceroSucursalEntrega {
  return {
    id: createDraftId("branch"),
    descripcion: "",
    direccion: "",
    localidad: "",
    responsable: "",
    telefono: "",
    horario: "",
    principal: false,
    orden: null,
  }
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
    sucursalesEntrega: (sections?.sucursalesEntrega ?? []).map((branch) => ({
      ...createCustomerBranch(),
      ...branch,
      id: branch.id ?? createDraftId("branch"),
    })),
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
    razonSocial: form.razonSocial,
    nombreFantasia: form.nombreFantasia ?? null,
    tipoPersoneria: form.tipoPersoneria ?? null,
    nombre: form.nombre ?? null,
    apellido: form.apellido ?? null,
    esEntidadGubernamental: Boolean(form.esEntidadGubernamental),
    claveFiscal: form.claveFiscal ?? null,
    valorClaveFiscal: form.valorClaveFiscal ?? null,
    nroDocumento: form.nroDocumento ?? null,
    condicionIvaId: form.condicionIvaId,
    esCliente: form.esCliente,
    esProveedor: form.esProveedor,
    esEmpleado: form.esEmpleado,
    calle: form.calle ?? null,
    nro: form.nro ?? null,
    piso: form.piso ?? null,
    dpto: form.dpto ?? null,
    codigoPostal: form.codigoPostal ?? null,
    localidadId: form.localidadId ?? null,
    barrioId: form.barrioId ?? null,
    nroIngresosBrutos: form.nroIngresosBrutos ?? null,
    nroMunicipal: form.nroMunicipal ?? null,
    telefono: form.telefono ?? null,
    celular: form.celular ?? null,
    email: form.email ?? null,
    web: form.web ?? null,
    monedaId: form.monedaId ?? null,
    categoriaId: form.categoriaId ?? null,
    limiteCredito: form.limiteCredito ?? null,
    facturable: form.facturable,
    cobradorId: form.cobradorId ?? null,
    pctComisionCobrador: form.pctComisionCobrador,
    vendedorId: form.vendedorId ?? null,
    pctComisionVendedor: form.pctComisionVendedor,
    observacion: form.observacion ?? null,
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
  limiteCredito: null,
  facturable: true,
  cobradorId: null,
  pctComisionCobrador: 0,
  vendedorId: null,
  pctComisionVendedor: 0,
  observacion: null,
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
    limiteCredito: customer.limiteCredito,
    facturable: customer.facturable,
    cobradorId: customer.cobradorId,
    pctComisionCobrador: customer.pctComisionCobrador,
    vendedorId: customer.vendedorId,
    pctComisionVendedor: customer.pctComisionVendedor,
    observacion: customer.observacion,
  }
}

interface CustomerFormProps {
  customer: Tercero | null
  onClose: () => void
  onSaved: () => void
  createTercero: (dto: CreateTerceroDto) => Promise<boolean>
  updateTercero: (id: number, dto: UpdateTerceroDto) => Promise<boolean>
}

function CustomerForm({
  customer,
  onClose,
  onSaved,
  createTercero,
  updateTercero,
}: CustomerFormProps) {
  const { condicionesIva, monedas, tiposDocumento } = useTercerosConfig()
  const [tab, setTab] = useState("basicos")
  const [form, setForm] = useState<CreateTerceroDto>(() => buildCustomerForm(customer))
  const { localidades, barrios } = useGeografia({
    autoFetchLocalidades: true,
    localidadId: form.localidadId,
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const set = (k: keyof CreateTerceroDto, v: unknown) => setForm((prev) => ({ ...prev, [k]: v }))

  const str = (v: string) => v || null
  const num = (v: string) => (v ? Number(v) : null)

  useEffect(() => {
    setForm(buildCustomerForm(customer))
  }, [customer])

  const validate = (): string | null => {
    if (!form.razonSocial.trim()) return "La razón social es requerida"
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

  const handleSave = async () => {
    const err = validate()
    if (err) {
      setFormError(err)
      return
    }
    setSaving(true)
    setFormError(null)
    const ok = customer
      ? await updateTercero(customer.id, buildUpdatePayload(customer.id, form))
      : await createTercero(form)
    setSaving(false)
    if (ok) onSaved()
    else setFormError("No se pudo guardar el cliente")
  }

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid h-auto w-full grid-cols-5">
          {[
            { key: "basicos", label: "Datos Básicos" },
            { key: "ubicacion", label: "Ubicación" },
            { key: "fiscal", label: "Fiscal" },
            { key: "comercial", label: "Comercial" },
            { key: "otros", label: "Otros" },
          ].map((t) => (
            <TabsTrigger key={t.key} value={t.key} className="text-xs capitalize py-2">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tab 1: Datos Básicos */}
        <TabsContent value="basicos" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
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
                  El legajo es inmutable en la API actual.
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>
                Tipo de personería <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.tipoPersoneria ?? "JURIDICA"}
                onValueChange={(value) =>
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
            {form.tipoPersoneria === "FISICA" && (
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
            )}
            <div className="space-y-1.5">
              <Label>
                Razón Social <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Empresa SA"
                value={form.razonSocial}
                onChange={(e) => set("razonSocial", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nombre Fantasía</Label>
              <Input
                placeholder="Nombre de fantasía"
                value={form.nombreFantasia ?? ""}
                onChange={(e) => set("nombreFantasia", str(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="contacto@empresa.com"
                value={form.email ?? ""}
                onChange={(e) => set("email", str(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input
                placeholder="011-1234-5678"
                value={form.telefono ?? ""}
                onChange={(e) => set("telefono", str(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Celular</Label>
              <Input
                placeholder="11-1234-5678"
                value={form.celular ?? ""}
                onChange={(e) => set("celular", str(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sitio Web</Label>
              <Input
                placeholder="https://www.empresa.com"
                value={form.web ?? ""}
                onChange={(e) => set("web", str(e.target.value))}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ubicacion" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2">
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
                onValueChange={(v) => {
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
                onValueChange={(v) => set("barrioId", v === "__none__" ? null : Number(v))}
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tipo de documento</Label>
              <Select
                value={form.tipoDocumentoId ? String(form.tipoDocumentoId) : "__none__"}
                onValueChange={(v) => set("tipoDocumentoId", v === "__none__" ? null : Number(v))}
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
                onChange={(e) => set("nroDocumento", str(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Condición IVA <span className="text-red-500">*</span>
              </Label>
              <Select
                value={form.condicionIvaId ? String(form.condicionIvaId) : ""}
                onValueChange={(v) => set("condicionIvaId", Number(v))}
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
            <div className="col-span-2 flex items-center gap-2 pt-1">
              <Switch
                id="entidad-gubernamental"
                checked={Boolean(form.esEntidadGubernamental)}
                onCheckedChange={(value) => set("esEntidadGubernamental", value)}
                disabled={form.tipoPersoneria === "FISICA"}
              />
              <Label htmlFor="entidad-gubernamental">Entidad gubernamental</Label>
            </div>
          </div>
        </TabsContent>

        {/* Tab 3: Comercial */}
        <TabsContent value="comercial" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Moneda</Label>
              <Select
                value={form.monedaId ? String(form.monedaId) : "__none__"}
                onValueChange={(v) => set("monedaId", v !== "__none__" ? Number(v) : null)}
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
              <Label>Categoría</Label>
              <Input
                type="number"
                min={0}
                placeholder="ID de categoría"
                value={form.categoriaId ?? ""}
                onChange={(e) => set("categoriaId", num(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cobrador</Label>
              <Input
                type="number"
                min={0}
                placeholder="ID cobrador"
                value={form.cobradorId ?? ""}
                onChange={(e) => set("cobradorId", num(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>% Comisión Cobrador</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={form.pctComisionCobrador}
                onChange={(e) => set("pctComisionCobrador", parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Vendedor</Label>
              <Input
                type="number"
                min={0}
                placeholder="ID vendedor"
                value={form.vendedorId ?? ""}
                onChange={(e) => set("vendedorId", num(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>% Comisión Vendedor</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={form.pctComisionVendedor}
                onChange={(e) => set("pctComisionVendedor", parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Switch
              id="facturable"
              checked={form.facturable}
              onCheckedChange={(v) => set("facturable", v)}
            />
            <Label htmlFor="facturable">Facturable</Label>
          </div>
        </TabsContent>

        <TabsContent value="otros" className="space-y-4 mt-4">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Roles del registro</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="esCliente"
                      checked={form.esCliente}
                      onCheckedChange={(v) => set("esCliente", v)}
                    />
                    <Label htmlFor="esCliente">Es Cliente</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="esProveedor"
                      checked={form.esProveedor}
                      onCheckedChange={(v) => set("esProveedor", v)}
                    />
                    <Label htmlFor="esProveedor">Es Proveedor</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="esEmpleado"
                      checked={form.esEmpleado}
                      onCheckedChange={(v) => set("esEmpleado", v)}
                    />
                    <Label htmlFor="esEmpleado">Es Empleado</Label>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Resumen operativo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>Personería: {personeriaLabel(form.tipoPersoneria)}</p>
                  <p>Legajo: {form.legajo || "Sin legajo"}</p>
                  <p>{formatRelationLabel("Vendedor", form.vendedorId)}</p>
                  <p>{formatRelationLabel("Cobrador", form.cobradorId)}</p>
                  <p>Límite configurado: {formatMoney(form.limiteCredito)}</p>
                  <p>{form.facturable ? "Disponible para facturación" : "No facturable"}</p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-1.5">
              <Label>Observación</Label>
              <Textarea
                placeholder="Observaciones y notas operativas..."
                value={form.observacion ?? ""}
                onChange={(e) => set("observacion", str(e.target.value))}
                className="h-24 resize-none"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {formError && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="h-4 w-4" /> {formError}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button variant="outline" onClick={onClose} className="bg-transparent">
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Check className="h-4 w-4 mr-2" />
          {saving ? "Guardando..." : customer ? "Guardar Cambios" : "Crear Cliente"}
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
  onEditSections,
}: {
  customer: Tercero
  sections: CustomerSections
  onClose: () => void
  onEdit: () => void
  onEditSections: () => void
}) {
  const { monedas } = useTercerosConfig()
  const monedaDescripcion =
    monedas.find((moneda) => moneda.id === customer.monedaId)?.descripcion ??
    (customer.monedaId ? `#${customer.monedaId}` : "-")
  const profile = sections.perfilComercial

  const identificationFields = [
    { label: "Legajo", value: customer.legajo ?? "-" },
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
    { label: "Fecha Alta", value: new Date(customer.createdAt).toLocaleDateString("es-AR") },
  ]

  const locationFields = [
    { label: "Calle", value: customer.calle ?? "-" },
    { label: "Número", value: customer.nro ?? "-" },
    { label: "Piso", value: customer.piso ?? "-" },
    { label: "Departamento", value: customer.dpto ?? "-" },
    { label: "Código Postal", value: customer.codigoPostal ?? "-" },
    {
      label: "Localidad",
      value:
        customer.localidadDescripcion ??
        (customer.localidadId ? String(customer.localidadId) : "-"),
    },
    { label: "Barrio", value: customer.barrioId ? String(customer.barrioId) : "-" },
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
    { label: "Categoría", value: customer.categoriaId ? `#${customer.categoriaId}` : "-" },
    {
      label: "Límite de Crédito",
      value: formatMoney(customer.limiteCredito),
    },
    { label: "Cobrador", value: customer.cobradorId ? `#${customer.cobradorId}` : "-" },
    { label: "% Comisión Cobrador", value: `${customer.pctComisionCobrador}%` },
    { label: "Vendedor", value: customer.vendedorId ? `#${customer.vendedorId}` : "-" },
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
      customer.limiteCredito !== null ? "Límite de crédito" : null,
      customer.condicionIvaDescripcion ? "Cobertura fiscal" : null,
      sections.contactos.length > 0 ? "Contactos adicionales" : null,
      sections.sucursalesEntrega.length > 0 ? "Sucursales y entregas" : null,
      sections.transportes.length > 0 ? "Transportes asociados" : null,
      sections.ventanasCobranza.length > 0 ? "Ventanas de cobranza" : null,
      profile.zonaComercialId || profile.zonaComercialDescripcion || profile.rubro
        ? "Perfil comercial"
        : null,
    ].filter(Boolean) as string[],
    missing: [
      sections.contactos.length === 0 ? "Sin contactos adicionales" : null,
      sections.sucursalesEntrega.length === 0 ? "Sin sucursales de entrega" : null,
      sections.transportes.length === 0 ? "Sin transportes asociados" : null,
      sections.ventanasCobranza.length === 0 ? "Sin ventanas de cobranza" : null,
      !profile.zonaComercialId && !profile.zonaComercialDescripcion && !profile.rubro
        ? "Sin perfil comercial"
        : null,
    ].filter(Boolean) as string[],
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
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
                    <p className="font-medium text-sm wrap-break-word">{f.value}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )
        })}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
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
                    <p className="text-sm font-medium wrap-break-word">{channel.value}</p>
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Sucursales y entrega
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {sections.sucursalesEntrega.length === 0 ? (
              <div className="rounded-lg bg-muted/40 p-3">Sin sucursales registradas</div>
            ) : null}
            {sections.sucursalesEntrega.map((branch) => (
              <div key={branch.id} className="rounded-lg bg-muted/40 p-3">
                <p className="font-medium text-foreground">
                  {branch.descripcion || "Sucursal sin nombre"}
                </p>
                <p>{branch.direccion || "Sin dirección"}</p>
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
      <DialogFooter className="gap-2 mt-2">
        <Button variant="outline" onClick={onClose} className="bg-transparent">
          Cerrar
        </Button>
        <Button variant="outline" onClick={onEditSections} className="bg-transparent">
          <BriefcaseBusiness className="h-4 w-4 mr-2" /> Editar secciones
        </Button>
        <Button onClick={onEdit}>
          <Edit className="h-4 w-4 mr-2" /> Editar Cliente
        </Button>
      </DialogFooter>
    </div>
  )
}

function CustomerSectionsDialog({
  customer,
  sections,
  onClose,
  onSave,
  saving,
  error,
}: {
  customer: Tercero
  sections: CustomerSections
  onClose: () => void
  onSave: (sections: CustomerSections) => void
  saving: boolean
  error: string | null
}) {
  const [draft, setDraft] = useState<CustomerSections>(normalizeCustomerSections(sections))

  useEffect(() => {
    setDraft(normalizeCustomerSections(sections))
  }, [sections])

  const updateDraft = <K extends keyof CustomerSections>(key: K, value: CustomerSections[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const updateContact = (id: number | string | undefined, patch: Partial<TerceroContacto>) => {
    updateDraft(
      "contactos",
      draft.contactos.map((contact) => (contact.id === id ? { ...contact, ...patch } : contact))
    )
  }

  const updateBranch = (
    id: number | string | undefined,
    patch: Partial<TerceroSucursalEntrega>
  ) => {
    updateDraft(
      "sucursalesEntrega",
      draft.sucursalesEntrega.map((branch) => (branch.id === id ? { ...branch, ...patch } : branch))
    )
  }

  const updateTransport = (id: number | string | undefined, patch: Partial<TerceroTransporte>) => {
    updateDraft(
      "transportes",
      draft.transportes.map((transport) =>
        transport.id === id ? { ...transport, ...patch } : transport
      )
    )
  }

  const updateCollectionWindow = (
    id: number | string | undefined,
    patch: Partial<TerceroVentanaCobranza>
  ) => {
    updateDraft(
      "ventanasCobranza",
      draft.ventanasCobranza.map((window) => (window.id === id ? { ...window, ...patch } : window))
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>ID zona comercial</Label>
          <Input
            type="number"
            min={1}
            value={draft.perfilComercial.zonaComercialId ?? ""}
            onChange={(e) =>
              updateDraft("perfilComercial", {
                ...draft.perfilComercial,
                zonaComercialId: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Riesgo crediticio</Label>
          <Select
            value={draft.perfilComercial.riesgoCrediticio ?? "NORMAL"}
            onValueChange={(value) =>
              updateDraft("perfilComercial", {
                ...draft.perfilComercial,
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
            value={draft.perfilComercial.rubro ?? ""}
            onChange={(e) =>
              updateDraft("perfilComercial", {
                ...draft.perfilComercial,
                rubro: e.target.value,
              })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Subrubro</Label>
          <Input
            value={draft.perfilComercial.subrubro ?? ""}
            onChange={(e) =>
              updateDraft("perfilComercial", {
                ...draft.perfilComercial,
                subrubro: e.target.value,
              })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Sector</Label>
          <Input
            value={draft.perfilComercial.sector ?? ""}
            onChange={(e) =>
              updateDraft("perfilComercial", {
                ...draft.perfilComercial,
                sector: e.target.value,
              })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Condición cobranza</Label>
          <Input
            value={draft.perfilComercial.condicionCobranza ?? ""}
            onChange={(e) =>
              updateDraft("perfilComercial", {
                ...draft.perfilComercial,
                condicionCobranza: e.target.value,
              })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Vigencia saldo</Label>
          <Input
            value={draft.perfilComercial.vigenciaSaldo ?? ""}
            onChange={(e) =>
              updateDraft("perfilComercial", {
                ...draft.perfilComercial,
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
            value={draft.perfilComercial.saldoMaximoVigente ?? ""}
            onChange={(e) =>
              updateDraft("perfilComercial", {
                ...draft.perfilComercial,
                saldoMaximoVigente: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Condición venta</Label>
          <Input
            value={draft.perfilComercial.condicionVenta ?? ""}
            onChange={(e) =>
              updateDraft("perfilComercial", {
                ...draft.perfilComercial,
                condicionVenta: e.target.value,
              })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Plazo cobro</Label>
          <Input
            value={draft.perfilComercial.plazoCobro ?? ""}
            onChange={(e) =>
              updateDraft("perfilComercial", {
                ...draft.perfilComercial,
                plazoCobro: e.target.value,
              })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Facturador por defecto</Label>
          <Input
            value={draft.perfilComercial.facturadorPorDefecto ?? ""}
            onChange={(e) =>
              updateDraft("perfilComercial", {
                ...draft.perfilComercial,
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
            value={draft.perfilComercial.minimoFacturaMipymes ?? ""}
            onChange={(e) =>
              updateDraft("perfilComercial", {
                ...draft.perfilComercial,
                minimoFacturaMipymes: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Observación comercial</Label>
          <Textarea
            className="h-24 resize-none"
            value={draft.perfilComercial.observacionComercial ?? ""}
            onChange={(e) =>
              updateDraft("perfilComercial", {
                ...draft.perfilComercial,
                observacionComercial: e.target.value,
              })
            }
          />
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
          <CardTitle className="text-base">Contactos múltiples</CardTitle>
          <Button
            type="button"
            variant="outline"
            className="bg-transparent"
            onClick={() => updateDraft("contactos", [...draft.contactos, createCustomerContact()])}
          >
            <Plus className="h-4 w-4 mr-2" /> Agregar
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {draft.contactos.map((contact) => (
            <div key={contact.id} className="rounded-lg border p-4 space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
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
                  onChange={(e) => updateContact(contact.id, { email: e.target.value })}
                />
                <Input
                  placeholder="Teléfono"
                  value={contact.telefono ?? ""}
                  onChange={(e) => updateContact(contact.id, { telefono: e.target.value })}
                />
                <div className="flex items-center justify-between rounded-md border px-3">
                  <Label htmlFor={`principal-${contact.id}`}>Principal</Label>
                  <Switch
                    id={`principal-${contact.id}`}
                    checked={contact.principal}
                    onCheckedChange={(checked) => updateContact(contact.id, { principal: checked })}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    updateDraft(
                      "contactos",
                      draft.contactos.filter((row) => row.id !== contact.id)
                    )
                  }
                >
                  <X className="h-4 w-4 mr-2" /> Quitar
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
          <CardTitle className="text-base">Sucursales y puntos de entrega</CardTitle>
          <Button
            type="button"
            variant="outline"
            className="bg-transparent"
            onClick={() =>
              updateDraft("sucursalesEntrega", [...draft.sucursalesEntrega, createCustomerBranch()])
            }
          >
            <Plus className="h-4 w-4 mr-2" /> Agregar
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {draft.sucursalesEntrega.map((branch) => (
            <div key={branch.id} className="rounded-lg border p-4 space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  placeholder="Descripción"
                  value={branch.descripcion ?? ""}
                  onChange={(e) => updateBranch(branch.id, { descripcion: e.target.value })}
                />
                <Input
                  placeholder="Responsable"
                  value={branch.responsable ?? ""}
                  onChange={(e) => updateBranch(branch.id, { responsable: e.target.value })}
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
                  placeholder="Teléfono"
                  value={branch.telefono ?? ""}
                  onChange={(e) => updateBranch(branch.id, { telefono: e.target.value })}
                />
                <Input
                  placeholder="Horario"
                  value={branch.horario ?? ""}
                  onChange={(e) => updateBranch(branch.id, { horario: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={branch.principal}
                    onCheckedChange={(checked) => updateBranch(branch.id, { principal: checked })}
                  />
                  <Label>Sucursal principal</Label>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    updateDraft(
                      "sucursalesEntrega",
                      draft.sucursalesEntrega.filter((row) => row.id !== branch.id)
                    )
                  }
                >
                  <X className="h-4 w-4 mr-2" /> Quitar
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
            <CardTitle className="text-base">Transportes asociados</CardTitle>
            <Button
              type="button"
              variant="outline"
              className="bg-transparent"
              onClick={() =>
                updateDraft("transportes", [...draft.transportes, createCustomerTransport()])
              }
            >
              <Plus className="h-4 w-4 mr-2" /> Agregar
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {draft.transportes.map((transport) => (
              <div key={transport.id} className="rounded-lg border p-4 space-y-3">
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
                  onChange={(e) => updateTransport(transport.id, { servicio: e.target.value })}
                />
                <Input
                  placeholder="Zona"
                  value={transport.zona ?? ""}
                  onChange={(e) => updateTransport(transport.id, { zona: e.target.value })}
                />
                <Input
                  placeholder="Frecuencia"
                  value={transport.frecuencia ?? ""}
                  onChange={(e) => updateTransport(transport.id, { frecuencia: e.target.value })}
                />
                <Textarea
                  placeholder="Observación"
                  value={transport.observacion ?? ""}
                  onChange={(e) => updateTransport(transport.id, { observacion: e.target.value })}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={transport.activo}
                        onCheckedChange={(checked) =>
                          updateTransport(transport.id, { activo: checked })
                        }
                      />
                      <Label>Activo</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={Boolean(transport.principal)}
                        onCheckedChange={(checked) =>
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
                    onClick={() =>
                      updateDraft(
                        "transportes",
                        draft.transportes.filter((row) => row.id !== transport.id)
                      )
                    }
                  >
                    <X className="h-4 w-4 mr-2" /> Quitar
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
            <CardTitle className="text-base">Ventanas de cobranza</CardTitle>
            <Button
              type="button"
              variant="outline"
              className="bg-transparent"
              onClick={() =>
                updateDraft("ventanasCobranza", [
                  ...draft.ventanasCobranza,
                  createCustomerCollectionWindow(),
                ])
              }
            >
              <Plus className="h-4 w-4 mr-2" /> Agregar
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {draft.ventanasCobranza.map((window) => (
              <div key={window.id} className="rounded-lg border p-4 space-y-3">
                <Input
                  placeholder="Día"
                  value={window.dia ?? ""}
                  onChange={(e) => updateCollectionWindow(window.id, { dia: e.target.value })}
                />
                <Input
                  placeholder="Franja"
                  value={window.franja ?? ""}
                  onChange={(e) => updateCollectionWindow(window.id, { franja: e.target.value })}
                />
                <Input
                  placeholder="Canal"
                  value={window.canal ?? ""}
                  onChange={(e) => updateCollectionWindow(window.id, { canal: e.target.value })}
                />
                <Input
                  placeholder="Responsable"
                  value={window.responsable ?? ""}
                  onChange={(e) =>
                    updateCollectionWindow(window.id, { responsable: e.target.value })
                  }
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={Boolean(window.principal)}
                      onCheckedChange={(checked) =>
                        updateCollectionWindow(window.id, { principal: checked })
                      }
                    />
                    <Label>Principal</Label>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      updateDraft(
                        "ventanasCobranza",
                        draft.ventanasCobranza.filter((row) => row.id !== window.id)
                      )
                    }
                  >
                    <X className="h-4 w-4 mr-2" /> Quitar
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between border-t pt-4">
        <p className="text-sm text-muted-foreground">
          Persistencia backend del cliente #{customer.id}. Cada bloque se guarda en su endpoint
          real.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" className="bg-transparent" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => onSave(draft)} disabled={saving}>
            {saving ? "Guardando..." : "Guardar secciones"}
          </Button>
        </div>
      </div>
      {error ? (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="h-4 w-4" /> {error}
        </p>
      ) : null}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ClientesPage() {
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
  } = useTerceros({ soloActivos: false })

  const [debouncedSearch, setDebouncedSearch] = useState(search)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    setDebouncedSearch(search)
  }, [search])

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
  const [isSectionsOpen, setIsSectionsOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Tercero | null>(null)
  const [editingCustomer, setEditingCustomer] = useState<Tercero | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<Tercero | null>(null)
  const [selectedCustomerSections, setSelectedCustomerSections] = useState<CustomerSections | null>(
    null
  )
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [formLoadError, setFormLoadError] = useState<string | null>(null)
  const [sectionsSaving, setSectionsSaving] = useState(false)

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
    setIsFormOpen(true)
    try {
      const detail = await getTerceroById(c.id)
      setEditingCustomer(detail)
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

  const handleSectionsEdit = (c: Tercero) => {
    setSelectedCustomer(c)
    setIsSectionsOpen(true)
    if (selectedCustomerDetail?.id !== c.id || !selectedCustomerSections) {
      setSelectedCustomerDetail(null)
      setSelectedCustomerSections(null)
      void loadCustomerSnapshot(c.id)
    }
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

  const handleSaved = () => {
    setIsFormOpen(false)
    void refetch().then(() => {
      if (selectedCustomer) {
        void loadCustomerSnapshot(selectedCustomer.id)
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
        setIsSectionsOpen(false)
      } else if (nextSelected !== selectedCustomer) {
        setSelectedCustomer(nextSelected)
      }
    }

    if (editingCustomer) {
      const nextEditing = terceros.find((customer) => customer.id === editingCustomer.id)

      if (!nextEditing) {
        setEditingCustomer(null)
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
      destacado,
    }
  }, [terceros])

  const saveCustomerSections = async (sections: CustomerSections) => {
    if (!selectedCustomer) return

    setSectionsSaving(true)
    setDetailError(null)

    const profileOk = await updatePerfilComercial(
      selectedCustomer.id,
      sanitizePerfilComercial(sections.perfilComercial)
    )
    const contactsOk = await updateContactos(
      selectedCustomer.id,
      sections.contactos.map((contact, index) => sanitizeContact({ ...contact, orden: index }))
    )
    const branchesOk = await updateSucursalesEntrega(
      selectedCustomer.id,
      sections.sucursalesEntrega.map((branch, index) => sanitizeBranch({ ...branch, orden: index }))
    )
    const transportesOk = await updateTransportes(
      selectedCustomer.id,
      sections.transportes.map((transport, index) =>
        sanitizeTransport({ ...transport, orden: index })
      )
    )
    const ventanasOk = await updateVentanasCobranza(
      selectedCustomer.id,
      sections.ventanasCobranza.map((window, index) =>
        sanitizeCollectionWindow({ ...window, orden: index })
      )
    )

    setSectionsSaving(false)

    if (profileOk && contactsOk && branchesOk && transportesOk && ventanasOk) {
      setIsSectionsOpen(false)
      await refetch()
      await loadCustomerSnapshot(selectedCustomer.id)
      return
    }

    setDetailError("No se pudieron guardar todas las secciones del cliente")
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000"

  return (
    <div className="space-y-6 pb-6">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">Maestro de clientes y gestión de crédito</p>
        </div>
        <Button
          onClick={() => {
            setEditingCustomer(null)
            setIsFormOpen(true)
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
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

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-48">
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
            {debouncedSearch && (
              <Button
                variant="ghost"
                size="sm"
                className="bg-transparent"
                onClick={() => {
                  setDebouncedSearch("")
                  setSearch("")
                }}
              >
                <X className="h-3 w-3 mr-1" /> Limpiar
              </Button>
            )}
          </div>
          {!loading && !error && (
            <p className="text-xs text-muted-foreground mt-2">
              {terceros.length} visibles en esta página · {totalCount} clientes encontrados
            </p>
          )}
        </CardContent>
      </Card>

      {!loading && !error && (
        <div className="grid gap-4 md:grid-cols-2">
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
                    ? `No se pudo conectar con el servidor. Verificá que el backend esté corriendo en ${apiUrl}.`
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Razón Social</TableHead>
                    <TableHead>CUIT/CUIL</TableHead>
                    <TableHead>Condición IVA</TableHead>
                    <TableHead>Localidad</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Límite Crédito</TableHead>
                    <TableHead>Estado</TableHead>
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
                          {customer.localidadDescripcion ?? "-"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {customer.email ? (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {customer.email}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {customer.telefono ? (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {customer.telefono}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {customer.limiteCredito !== null ? (
                            "$" + customer.limiteCredito.toLocaleString("es-AR")
                          ) : (
                            <span className="text-muted-foreground">Sin límite</span>
                          )}
                        </TableCell>
                        <TableCell>{activoBadge(customer.activo)}</TableCell>
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

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-xs text-muted-foreground">
                    Página {page} de {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" /> Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
              onEditSections={() => {
                setIsDetailOpen(false)
                handleSectionsEdit(selectedCustomerDetail)
              }}
              onEdit={() => {
                setIsDetailOpen(false)
                void handleEdit(selectedCustomerDetail)
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isSectionsOpen} onOpenChange={setIsSectionsOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedCustomer
                ? `Secciones comerciales: ${selectedCustomer.razonSocial}`
                : "Secciones comerciales del cliente"}
            </DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span className="ml-2">Cargando secciones del cliente...</span>
            </div>
          ) : selectedCustomer && selectedCustomerSections ? (
            <CustomerSectionsDialog
              customer={selectedCustomer}
              sections={selectedCustomerSections}
              onClose={() => setIsSectionsOpen(false)}
              onSave={(sections) => void saveCustomerSections(sections)}
              saving={sectionsSaving}
              error={detailError}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? "Editar: " + editingCustomer.razonSocial : "Nuevo Cliente"}
            </DialogTitle>
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
                onClose={() => setIsFormOpen(false)}
                onSaved={handleSaved}
                createTercero={createTercero}
                updateTercero={updateTercero}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-sm">
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
