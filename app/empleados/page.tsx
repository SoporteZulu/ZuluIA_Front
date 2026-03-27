"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  FileBadge,
  IdCard,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useEmpleados } from "@/lib/hooks/useEmpleados"
import { useSucursales } from "@/lib/hooks/useSucursales"
import type { CreateEmpleadoDto, Empleado } from "@/lib/types/empleados"

type LegacyAddress = {
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

type LegacyContact = {
  id: string
  tipo: string
  valor: string
  observacion: string
}

type LegacyProfile = {
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

type EmployeeFormState = {
  api: CreateEmpleadoDto
  legacy: LegacyProfile
}

const LEGACY_PROFILE_STORAGE_KEY = "zuluia_empleados_legacy_profiles"

const estadoVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  activo: "default",
  inactivo: "secondary",
  suspendido: "outline",
  licencia: "outline",
}

const treatmentOptions = ["Sr.", "Sra.", "Srta.", "Dr.", "Dra.", "Ing.", "Lic."]
const civilStatusOptions = ["Soltero/a", "Casado/a", "Divorciado/a", "Viudo/a", "Otro"]
const genderOptions = ["M", "F", "Otro", "No informa"]
const documentTypeOptions = ["DNI", "CUIT", "CUIL", "Pasaporte", "LC", "LE"]
const nationalityOptions = ["Argentina", "Uruguaya", "Paraguaya", "Boliviana", "Otra"]
const profileOptions = ["Administración", "Ventas", "Cobranzas", "Supervisor", "Operario"]
const areaOptions = ["Comercial", "Administración", "Logística", "Producción", "RRHH"]
const fiscalOptions = ["Responsable Inscripto", "Monotributo", "Exento", "Consumidor Final"]

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`
}

function formatCurrency(value: number) {
  return value.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  })
}

function formatDate(value?: string) {
  if (!value) return "-"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"

  return date.toLocaleDateString("es-AR")
}

function getDaysSince(value?: string) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
}

function emptyAddress(): LegacyAddress {
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

function emptyContact(): LegacyContact {
  return {
    id: createId("contact"),
    tipo: "Email",
    valor: "",
    observacion: "",
  }
}

function buildDefaultLegacyProfile(empleado?: Empleado | null): LegacyProfile {
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

function buildFormState(
  empleado: Empleado | null,
  legacyProfile: LegacyProfile
): EmployeeFormState {
  return {
    api: {
      terceroId: empleado?.terceroId ?? 0,
      sucursalId: empleado?.sucursalId ?? 0,
      legajo: empleado?.legajo ?? "",
      categoria: empleado?.categoria ?? "",
      fechaIngreso: empleado?.fechaIngreso?.slice(0, 10) ?? "",
      sueldoBasico: Number(empleado?.sueldoBasico ?? 0),
    },
    legacy: {
      ...legacyProfile,
      domicilios: legacyProfile.domicilios.length > 0 ? legacyProfile.domicilios : [emptyAddress()],
      contactos: legacyProfile.contactos.length > 0 ? legacyProfile.contactos : [emptyContact()],
    },
  }
}

function getRosterStatus(empleado: Empleado, legacyProfile: LegacyProfile) {
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

function getDisplayName(empleado: Empleado, legacyProfile: LegacyProfile) {
  const fullName = [legacyProfile.nombre, legacyProfile.apellido].filter(Boolean).join(" ").trim()
  return (
    fullName ||
    legacyProfile.denominacionSocial ||
    empleado.razonSocial ||
    `Empleado ${empleado.id}`
  )
}

function getPrimaryContact(profile: LegacyProfile) {
  return profile.contactos.find((contact) => contact.valor.trim()) ?? profile.contactos[0] ?? null
}

function getPrimaryAddress(profile: LegacyProfile) {
  return profile.domicilios.find((address) => address.calle.trim()) ?? profile.domicilios[0] ?? null
}

function loadLegacyProfiles(): Record<string, LegacyProfile> {
  if (typeof window === "undefined") return {}

  try {
    const raw = window.localStorage.getItem(LEGACY_PROFILE_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, LegacyProfile>
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

function saveLegacyProfiles(profiles: Record<string, LegacyProfile>) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(LEGACY_PROFILE_STORAGE_KEY, JSON.stringify(profiles))
}

function SummaryCard({
  title,
  value,
  description,
  icon,
}: {
  title: string
  value: string | number
  description: string
  icon: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function DetailFieldGrid({ fields }: { fields: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {fields.map((field) => (
        <div key={field.label} className="rounded-lg border bg-muted/30 p-3">
          <span className="mb-1 block text-xs text-muted-foreground">{field.label}</span>
          <p className="text-sm font-medium wrap-break-word">{field.value}</p>
        </div>
      ))}
    </div>
  )
}

function EditableChips({
  title,
  values,
  options,
  onAdd,
  onRemove,
}: {
  title: string
  values: string[]
  options: string[]
  onAdd: (value: string) => void
  onRemove: (value: string) => void
}) {
  const available = options.filter((option) => !values.includes(option))

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">Bloque local hasta integrar el backend.</p>
        </div>
        <Select onValueChange={onAdd} value="__placeholder__">
          <SelectTrigger className="w-44">
            <SelectValue placeholder={`Agregar ${title.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__placeholder__" disabled>
              Seleccionar
            </SelectItem>
            {available.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap gap-2">
        {values.length === 0 && (
          <Badge variant="outline">Sin {title.toLowerCase()} asignados</Badge>
        )}
        {values.map((value) => (
          <Badge key={value} variant="secondary" className="gap-2 px-3 py-1">
            {value}
            <button type="button" onClick={() => onRemove(value)} className="text-xs">
              ×
            </button>
          </Badge>
        ))}
      </div>
    </div>
  )
}

interface EmployeeFormProps {
  empleado: Empleado | null
  legacyProfile: LegacyProfile
  sucursales: Array<{ id: number; descripcion: string }>
  onClose: () => void
  onSaved: (result: { profile: LegacyProfile; api: CreateEmpleadoDto; employeeId?: number }) => void
  crear: (dto: CreateEmpleadoDto) => Promise<number | null>
  actualizar: (id: number, dto: Partial<CreateEmpleadoDto>) => Promise<boolean>
}

function EmployeeForm({
  empleado,
  legacyProfile,
  sucursales,
  onClose,
  onSaved,
  crear,
  actualizar,
}: EmployeeFormProps) {
  const [tab, setTab] = useState("identidad")
  const [form, setForm] = useState<EmployeeFormState>(() => buildFormState(empleado, legacyProfile))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setForm(buildFormState(empleado, legacyProfile))
  }, [empleado, legacyProfile])

  const setApi = (key: keyof CreateEmpleadoDto, value: string | number | undefined) => {
    setForm((prev) => ({ ...prev, api: { ...prev.api, [key]: value } }))
  }

  const setLegacy = (
    key: keyof LegacyProfile,
    value: string | number | boolean | LegacyAddress[] | LegacyContact[] | string[]
  ) => {
    setForm((prev) => ({ ...prev, legacy: { ...prev.legacy, [key]: value } }))
  }

  const updateAddress = (id: string, key: keyof LegacyAddress, value: string) => {
    setLegacy(
      "domicilios",
      form.legacy.domicilios.map((address) =>
        address.id === id ? { ...address, [key]: value } : address
      )
    )
  }

  const updateContact = (id: string, key: keyof LegacyContact, value: string) => {
    setLegacy(
      "contactos",
      form.legacy.contactos.map((contact) =>
        contact.id === id ? { ...contact, [key]: value } : contact
      )
    )
  }

  const validate = () => {
    const issues: string[] = []
    const displayName = [form.legacy.nombre, form.legacy.apellido].filter(Boolean).join(" ").trim()
    const validBirthDate = form.legacy.fechaNacimiento
      ? new Date(form.legacy.fechaNacimiento).getTime() < Date.now()
      : true

    if (!form.api.terceroId || form.api.terceroId <= 0) issues.push("El tercero es obligatorio.")
    if (!form.api.sucursalId || form.api.sucursalId <= 0) issues.push("La sucursal es obligatoria.")
    if (!form.api.legajo?.trim()) issues.push("El legajo es obligatorio.")
    if (!form.api.categoria?.trim()) issues.push("La categoría es obligatoria.")
    if (!form.api.fechaIngreso) issues.push("La fecha de alta es obligatoria.")
    if (!displayName && !form.legacy.denominacionSocial.trim()) {
      issues.push("Debe informar nombre y apellido o denominación social.")
    }
    if (!form.legacy.tipoDocumento) issues.push("El tipo de documento es obligatorio.")
    if (!form.legacy.nroDocumento.trim()) issues.push("El número de documento es obligatorio.")
    if (!validBirthDate) issues.push("La fecha de nacimiento debe ser anterior a hoy.")
    if (form.legacy.facturable && !form.legacy.condicionFiscal.trim()) {
      issues.push("La condición fiscal es obligatoria cuando el empleado es facturable.")
    }
    if (form.legacy.aplicaComisionVentas && form.legacy.comisionVentas <= 0) {
      issues.push("La comisión de ventas debe ser mayor a cero.")
    }
    if (form.legacy.aplicaComisionCobranzas && form.legacy.comisionCobranzas <= 0) {
      issues.push("La comisión de cobranzas debe ser mayor a cero.")
    }

    const invalidContacts = form.legacy.contactos.filter((contact) => contact.valor.trim() === "")
    if (invalidContacts.length === form.legacy.contactos.length) {
      issues.push("Debe registrar al menos un medio de contacto.")
    }

    const invalidAddresses = form.legacy.domicilios.filter(
      (address) => !address.calle.trim() && !address.ciudad.trim()
    )
    if (invalidAddresses.length === form.legacy.domicilios.length) {
      issues.push("Debe registrar al menos un domicilio o ciudad de referencia.")
    }

    return issues
  }

  const handleSave = async () => {
    const issues = validate()
    if (issues.length > 0) {
      setError(issues[0])
      return
    }

    setSaving(true)
    setError(null)
    let employeeId = empleado?.id

    if (empleado) {
      const ok = await actualizar(empleado.id, form.api)
      setSaving(false)

      if (!ok) {
        setError("No se pudo guardar el empleado en la API actual.")
        return
      }
    } else {
      employeeId = await crear(form.api)
      setSaving(false)

      if (!employeeId) {
        setError("No se pudo guardar el empleado en la API actual.")
        return
      }
    }

    onSaved({
      profile: form.legacy,
      api: form.api,
      employeeId,
    })
  }

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid h-auto w-full grid-cols-3 gap-2 lg:grid-cols-6">
          <TabsTrigger value="identidad">Identidad</TabsTrigger>
          <TabsTrigger value="laboral">Laboral</TabsTrigger>
          <TabsTrigger value="domicilios">Domicilios</TabsTrigger>
          <TabsTrigger value="contactos">Contactos</TabsTrigger>
          <TabsTrigger value="rrhh">RRHH</TabsTrigger>
          <TabsTrigger value="fiscal">Fiscal</TabsTrigger>
        </TabsList>

        <TabsContent value="identidad" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-1.5">
              <Label>ID Tercero *</Label>
              <Input
                type="number"
                min={1}
                value={form.api.terceroId || ""}
                onChange={(e) => setApi("terceroId", Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sucursal *</Label>
              <Select
                value={form.api.sucursalId ? String(form.api.sucursalId) : ""}
                onValueChange={(value) => setApi("sucursalId", Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {sucursales.map((sucursal) => (
                    <SelectItem key={sucursal.id} value={String(sucursal.id)}>
                      {sucursal.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Legajo *</Label>
              <Input
                value={form.api.legajo ?? ""}
                onChange={(e) => setApi("legajo", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nro Interno</Label>
              <Input
                value={form.legacy.nroInterno}
                onChange={(e) => setLegacy("nroInterno", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tratamiento</Label>
              <Select
                value={form.legacy.tratamiento}
                onValueChange={(value) => setLegacy("tratamiento", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {treatmentOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Sexo</Label>
              <Select value={form.legacy.sexo} onValueChange={(value) => setLegacy("sexo", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {genderOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input
                value={form.legacy.nombre}
                onChange={(e) => setLegacy("nombre", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Apellido</Label>
              <Input
                value={form.legacy.apellido}
                onChange={(e) => setLegacy("apellido", e.target.value)}
              />
            </div>
            <div className="space-y-1.5 xl:col-span-1 md:col-span-2">
              <Label>Denominación Social</Label>
              <Input
                value={form.legacy.denominacionSocial}
                onChange={(e) => setLegacy("denominacionSocial", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo Documento *</Label>
              <Select
                value={form.legacy.tipoDocumento}
                onValueChange={(value) => setLegacy("tipoDocumento", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {documentTypeOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nro Documento *</Label>
              <Input
                value={form.legacy.nroDocumento}
                onChange={(e) => setLegacy("nroDocumento", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha Nacimiento</Label>
              <Input
                type="date"
                value={form.legacy.fechaNacimiento}
                onChange={(e) => setLegacy("fechaNacimiento", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nacionalidad</Label>
              <Select
                value={form.legacy.nacionalidad}
                onValueChange={(value) => setLegacy("nacionalidad", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {nationalityOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Estado Civil</Label>
              <Select
                value={form.legacy.estadoCivil}
                onValueChange={(value) => setLegacy("estadoCivil", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {civilStatusOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Profesión</Label>
              <Input
                value={form.legacy.profesion}
                onChange={(e) => setLegacy("profesion", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>País</Label>
              <Input value={form.legacy.pais} onChange={(e) => setLegacy("pais", e.target.value)} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="laboral" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Categoría *</Label>
              <Input
                value={form.api.categoria ?? ""}
                onChange={(e) => setApi("categoria", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha Alta *</Label>
              <Input
                type="date"
                value={form.api.fechaIngreso ?? ""}
                onChange={(e) => setApi("fechaIngreso", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha Registro</Label>
              <Input
                type="date"
                value={form.legacy.fechaRegistro}
                onChange={(e) => setLegacy("fechaRegistro", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sueldo Básico</Label>
              <Input
                type="number"
                min={0}
                value={form.api.sueldoBasico ?? 0}
                onChange={(e) => setApi("sueldoBasico", Number.parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Foto / referencia visual</Label>
              <Input
                value={form.legacy.fotoUrl}
                onChange={(e) => setLegacy("fotoUrl", e.target.value)}
              />
            </div>
          </div>

          <EditableChips
            title="Perfiles"
            values={form.legacy.perfiles}
            options={profileOptions}
            onAdd={(value) =>
              value !== "__placeholder__" && setLegacy("perfiles", [...form.legacy.perfiles, value])
            }
            onRemove={(value) =>
              setLegacy(
                "perfiles",
                form.legacy.perfiles.filter((profile) => profile !== value)
              )
            }
          />

          <EditableChips
            title="Áreas"
            values={form.legacy.areas}
            options={areaOptions}
            onAdd={(value) =>
              value !== "__placeholder__" && setLegacy("areas", [...form.legacy.areas, value])
            }
            onRemove={(value) =>
              setLegacy(
                "areas",
                form.legacy.areas.filter((area) => area !== value)
              )
            }
          />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">Comisión de Ventas</p>
                  <p className="text-xs text-muted-foreground">Replica la ficha legacy de RRHH.</p>
                </div>
                <Switch
                  checked={form.legacy.aplicaComisionVentas}
                  onCheckedChange={(checked) => setLegacy("aplicaComisionVentas", checked)}
                />
              </div>
              <div className="mt-3 space-y-1.5">
                <Label>Porcentaje</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  disabled={!form.legacy.aplicaComisionVentas}
                  value={form.legacy.comisionVentas}
                  onChange={(e) =>
                    setLegacy("comisionVentas", Number.parseFloat(e.target.value) || 0)
                  }
                />
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">Comisión de Cobranzas</p>
                  <p className="text-xs text-muted-foreground">
                    Visible aunque hoy no dependa de API.
                  </p>
                </div>
                <Switch
                  checked={form.legacy.aplicaComisionCobranzas}
                  onCheckedChange={(checked) => setLegacy("aplicaComisionCobranzas", checked)}
                />
              </div>
              <div className="mt-3 space-y-1.5">
                <Label>Porcentaje</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  disabled={!form.legacy.aplicaComisionCobranzas}
                  value={form.legacy.comisionCobranzas}
                  onChange={(e) =>
                    setLegacy("comisionCobranzas", Number.parseFloat(e.target.value) || 0)
                  }
                />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="domicilios" className="mt-4 space-y-4">
          {form.legacy.domicilios.map((address, index) => (
            <div key={address.id} className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">Domicilio {index + 1}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="bg-transparent"
                  disabled={form.legacy.domicilios.length === 1}
                  onClick={() =>
                    setLegacy(
                      "domicilios",
                      form.legacy.domicilios.filter((item) => item.id !== address.id)
                    )
                  }
                >
                  Eliminar
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Input
                    value={address.tipo}
                    onChange={(e) => updateAddress(address.id, "tipo", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Calle</Label>
                  <Input
                    value={address.calle}
                    onChange={(e) => updateAddress(address.id, "calle", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Número</Label>
                  <Input
                    value={address.numero}
                    onChange={(e) => updateAddress(address.id, "numero", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Piso</Label>
                  <Input
                    value={address.piso}
                    onChange={(e) => updateAddress(address.id, "piso", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Departamento</Label>
                  <Input
                    value={address.departamento}
                    onChange={(e) => updateAddress(address.id, "departamento", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Ciudad</Label>
                  <Input
                    value={address.ciudad}
                    onChange={(e) => updateAddress(address.id, "ciudad", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Provincia</Label>
                  <Input
                    value={address.provincia}
                    onChange={(e) => updateAddress(address.id, "provincia", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Código Postal</Label>
                  <Input
                    value={address.codigoPostal}
                    onChange={(e) => updateAddress(address.id, "codigoPostal", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>País</Label>
                  <Input
                    value={address.pais}
                    onChange={(e) => updateAddress(address.id, "pais", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Referencia</Label>
                <Textarea
                  value={address.referencia}
                  onChange={(e) => updateAddress(address.id, "referencia", e.target.value)}
                  className="min-h-20"
                />
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            className="bg-transparent"
            onClick={() => setLegacy("domicilios", [...form.legacy.domicilios, emptyAddress()])}
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar domicilio
          </Button>
        </TabsContent>

        <TabsContent value="contactos" className="mt-4 space-y-4">
          {form.legacy.contactos.map((contact, index) => (
            <div key={contact.id} className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">Medio de contacto {index + 1}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="bg-transparent"
                  disabled={form.legacy.contactos.length === 1}
                  onClick={() =>
                    setLegacy(
                      "contactos",
                      form.legacy.contactos.filter((item) => item.id !== contact.id)
                    )
                  }
                >
                  Eliminar
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Input
                    value={contact.tipo}
                    onChange={(e) => updateContact(contact.id, "tipo", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-1 xl:col-span-2">
                  <Label>Valor</Label>
                  <Input
                    value={contact.valor}
                    onChange={(e) => updateContact(contact.id, "valor", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Observación</Label>
                <Textarea
                  value={contact.observacion}
                  onChange={(e) => updateContact(contact.id, "observacion", e.target.value)}
                  className="min-h-20"
                />
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            className="bg-transparent"
            onClick={() => setLegacy("contactos", [...form.legacy.contactos, emptyContact()])}
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar contacto
          </Button>
        </TabsContent>

        <TabsContent value="rrhh" className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label>Observación</Label>
            <Textarea
              value={form.legacy.observacion}
              onChange={(e) => setLegacy("observacion", e.target.value)}
              className="min-h-28"
              placeholder="Observaciones del legajo, notas de RRHH y seguimiento operativo..."
            />
          </div>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Perfiles, áreas, domicilios, medios de contacto y comisiones quedan persistidos en el
              navegador hasta que el backend exponga esos bloques.
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="fiscal" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Condición Fiscal</Label>
              <Select
                value={form.legacy.condicionFiscal}
                onValueChange={(value) => setLegacy("condicionFiscal", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fiscalOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Clave Fiscal</Label>
              <Input
                value={form.legacy.claveFiscal}
                onChange={(e) => setLegacy("claveFiscal", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Valor Clave Fiscal</Label>
              <Input
                value={form.legacy.valorClaveFiscal}
                onChange={(e) => setLegacy("valorClaveFiscal", e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Facturable</p>
              <p className="text-xs text-muted-foreground">
                Replica el switch disponible en el legado.
              </p>
            </div>
            <Switch
              checked={form.legacy.facturable}
              onCheckedChange={(checked) => setLegacy("facturable", checked)}
            />
          </div>
        </TabsContent>
      </Tabs>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button variant="outline" className="bg-transparent" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Guardando..." : empleado ? "Guardar cambios" : "Crear empleado"}
        </Button>
      </div>
    </div>
  )
}

function EmployeeDetail({
  empleado,
  legacyProfile,
  sucursalNombre,
}: {
  empleado: Empleado
  legacyProfile: LegacyProfile
  sucursalNombre: string
}) {
  const displayName = getDisplayName(empleado, legacyProfile)
  const primaryContact = getPrimaryContact(legacyProfile)
  const primaryAddress = getPrimaryAddress(legacyProfile)

  const identityFields = [
    { label: "ID Empleado", value: String(empleado.id) },
    { label: "ID Tercero", value: String(empleado.terceroId) },
    { label: "Nombre visible", value: displayName },
    { label: "Legajo", value: empleado.legajo ?? "-" },
    { label: "Nro Interno", value: legacyProfile.nroInterno || "-" },
    {
      label: "Documento",
      value: `${legacyProfile.tipoDocumento} ${legacyProfile.nroDocumento || "-"}`,
    },
    { label: "Tratamiento", value: legacyProfile.tratamiento || "-" },
    { label: "Sexo", value: legacyProfile.sexo || "-" },
    { label: "Estado Civil", value: legacyProfile.estadoCivil || "-" },
    { label: "Nacionalidad", value: legacyProfile.nacionalidad || "-" },
    { label: "Profesión", value: legacyProfile.profesion || "-" },
    { label: "Fecha Nacimiento", value: formatDate(legacyProfile.fechaNacimiento) },
  ]

  const laboralFields = [
    { label: "Sucursal", value: sucursalNombre },
    { label: "Categoría", value: empleado.categoria ?? "-" },
    { label: "Estado", value: empleado.estado },
    { label: "Fecha Alta", value: formatDate(empleado.fechaIngreso) },
    { label: "Fecha Registro", value: formatDate(legacyProfile.fechaRegistro) },
    { label: "Sueldo Básico", value: formatCurrency(Number(empleado.sueldoBasico ?? 0)) },
    {
      label: "Comisión Ventas",
      value: legacyProfile.aplicaComisionVentas ? `${legacyProfile.comisionVentas}%` : "No aplica",
    },
    {
      label: "Comisión Cobranzas",
      value: legacyProfile.aplicaComisionCobranzas
        ? `${legacyProfile.comisionCobranzas}%`
        : "No aplica",
    },
    { label: "Perfiles", value: legacyProfile.perfiles.join(", ") || "Sin perfiles" },
    { label: "Áreas", value: legacyProfile.areas.join(", ") || "Sin áreas" },
  ]

  const contactFields = [
    {
      label: "Contacto principal",
      value: primaryContact
        ? `${primaryContact.tipo}: ${primaryContact.valor || "Sin valor"}`
        : "Sin contacto",
    },
    {
      label: "Dirección principal",
      value: primaryAddress
        ? [primaryAddress.calle, primaryAddress.numero, primaryAddress.ciudad]
            .filter(Boolean)
            .join(" ") || "Sin domicilio cargado"
        : "Sin domicilio",
    },
    { label: "País de residencia", value: primaryAddress?.pais || legacyProfile.pais || "-" },
  ]

  const fiscalFields = [
    { label: "Facturable", value: legacyProfile.facturable ? "Sí" : "No" },
    { label: "Condición Fiscal", value: legacyProfile.condicionFiscal || "-" },
    { label: "Clave Fiscal", value: legacyProfile.claveFiscal || "-" },
    { label: "Valor Clave Fiscal", value: legacyProfile.valorClaveFiscal || "-" },
    { label: "CUIT visible", value: empleado.cuit ?? "-" },
  ]

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-linear-to-br from-background via-background to-muted/40 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Ficha integral RRHH</p>
            <h2 className="text-2xl font-semibold">{displayName}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {empleado.legajo ? `Legajo ${empleado.legajo}` : `Tercero ${empleado.terceroId}`} ·{" "}
              {sucursalNombre}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={estadoVariant[empleado.estado] ?? "secondary"}>{empleado.estado}</Badge>
            <Badge variant={legacyProfile.facturable ? "default" : "outline"}>
              {legacyProfile.facturable ? "Facturable" : "No facturable"}
            </Badge>
          </div>
        </div>
      </div>

      <Tabs defaultValue="identidad" className="w-full">
        <TabsList className="grid w-full grid-cols-2 gap-2 lg:grid-cols-5">
          <TabsTrigger value="identidad">Identidad</TabsTrigger>
          <TabsTrigger value="laboral">Laboral</TabsTrigger>
          <TabsTrigger value="contacto">Contacto</TabsTrigger>
          <TabsTrigger value="fiscal">Fiscal</TabsTrigger>
          <TabsTrigger value="rrhh">RRHH</TabsTrigger>
        </TabsList>

        <TabsContent value="identidad" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <IdCard className="h-4 w-4" /> Identidad y padrón
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DetailFieldGrid fields={identityFields} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="laboral" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BriefcaseBusiness className="h-4 w-4" /> Datos laborales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DetailFieldGrid fields={laboralFields} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacto" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Phone className="h-4 w-4" /> Domicilios y contacto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DetailFieldGrid fields={contactFields} />
              <Separator />
              <div className="grid gap-3 lg:grid-cols-2">
                {legacyProfile.contactos.map((contact) => (
                  <div key={contact.id} className="rounded-lg border p-3">
                    <p className="text-sm font-medium">{contact.tipo}</p>
                    <p className="text-sm text-muted-foreground wrap-break-word">
                      {contact.valor || "Sin valor"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {contact.observacion || "Sin observación"}
                    </p>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {legacyProfile.domicilios.map((address) => (
                  <div key={address.id} className="rounded-lg border p-3">
                    <p className="text-sm font-medium">{address.tipo}</p>
                    <p className="text-sm text-muted-foreground wrap-break-word">
                      {[
                        address.calle,
                        address.numero,
                        address.piso && `Piso ${address.piso}`,
                        address.departamento && `Dto ${address.departamento}`,
                        address.ciudad,
                        address.provincia,
                      ]
                        .filter(Boolean)
                        .join(", ") || "Sin dirección cargada"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {address.referencia || "Sin referencia"}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fiscal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4" /> Bloque fiscal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DetailFieldGrid fields={fiscalFields} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rrhh" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileBadge className="h-4 w-4" /> Legajo ampliado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium">Perfiles asignados</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {legacyProfile.perfiles.join(", ") || "Sin perfiles informados"}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium">Áreas asignadas</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {legacyProfile.areas.join(", ") || "Sin áreas informadas"}
                  </p>
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium">Observación</p>
                <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                  {legacyProfile.observacion || "Sin observaciones cargadas."}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function EmpleadosPage() {
  const {
    empleados,
    loading,
    error,
    page,
    setPage,
    totalPages,
    totalCount,
    search,
    setSearch,
    crear,
    actualizar,
    refetch,
  } = useEmpleados()
  const { sucursales } = useSucursales()

  const [selectedEmpleadoId, setSelectedEmpleadoId] = useState<number | null>(null)
  const [detailEmpleadoId, setDetailEmpleadoId] = useState<number | null>(null)
  const [filterEstado, setFilterEstado] = useState("todos")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [legacyProfiles, setLegacyProfiles] = useState<Record<string, LegacyProfile>>(() =>
    loadLegacyProfiles()
  )

  useEffect(() => {
    if (Object.keys(legacyProfiles).length > 0) {
      saveLegacyProfiles(legacyProfiles)
    }
  }, [legacyProfiles])

  const mergedEmployees = useMemo(
    () =>
      empleados.map((empleado) => ({
        empleado,
        profile: legacyProfiles[String(empleado.id)] ?? buildDefaultLegacyProfile(empleado),
      })),
    [empleados, legacyProfiles]
  )

  const filteredEmpleados = useMemo(() => {
    return mergedEmployees.filter(({ empleado }) => {
      if (filterEstado === "todos") return true
      return empleado.estado === filterEstado
    })
  }, [filterEstado, mergedEmployees])

  const sucursalMap = new Map(sucursales.map((sucursal) => [sucursal.id, sucursal.descripcion]))
  const activos = mergedEmployees.filter(({ empleado }) => empleado.estado === "activo")
  const payrollVisible = mergedEmployees.reduce(
    (total, { empleado }) => total + Number(empleado.sueldoBasico ?? 0),
    0
  )
  const recentHires = [...mergedEmployees]
    .filter(({ empleado }) => empleado.fechaIngreso)
    .sort(
      (left, right) =>
        new Date(right.empleado.fechaIngreso ?? 0).getTime() -
        new Date(left.empleado.fechaIngreso ?? 0).getTime()
    )
    .slice(0, 6)
  const hiresLast90Days = recentHires.filter(({ empleado }) => {
    const days = getDaysSince(empleado.fechaIngreso)
    return days !== null && days <= 90
  }).length
  const rosterAlerts = mergedEmployees.filter(
    ({ empleado, profile }) => getRosterStatus(empleado, profile) !== "Completo"
  )
  const branchCoverage = sucursales
    .map((sucursal) => {
      const empleadosSucursal = mergedEmployees.filter(
        ({ empleado }) => empleado.sucursalId === sucursal.id
      )
      const activosSucursal = empleadosSucursal.filter(
        ({ empleado }) => empleado.estado === "activo"
      ).length
      const payrollSucursal = empleadosSucursal.reduce(
        (total, { empleado }) => total + Number(empleado.sueldoBasico ?? 0),
        0
      )
      const missingRoster = empleadosSucursal.filter(
        ({ empleado, profile }) => getRosterStatus(empleado, profile) !== "Completo"
      ).length

      return {
        id: sucursal.id,
        descripcion: sucursal.descripcion,
        total: empleadosSucursal.length,
        activos: activosSucursal,
        payroll: payrollSucursal,
        missingRoster,
      }
    })
    .filter((branch) => branch.total > 0)
    .sort((left, right) => right.total - left.total)

  const featuredEmployee = filteredEmpleados[0] ?? null
  const selectedEmpleado = useMemo(
    () => empleados.find((empleado) => empleado.id === selectedEmpleadoId) ?? null,
    [empleados, selectedEmpleadoId]
  )
  const detailEmpleado = useMemo(
    () => empleados.find((empleado) => empleado.id === detailEmpleadoId) ?? null,
    [detailEmpleadoId, empleados]
  )
  const formOpen = isFormOpen && (selectedEmpleadoId === null || selectedEmpleado !== null)
  const detailOpen = isDetailOpen && detailEmpleado !== null

  const handlePersistProfile = (employeeId: number, profile: LegacyProfile) => {
    setLegacyProfiles((prev) => ({
      ...prev,
      [String(employeeId)]: profile,
    }))
  }

  const closeForm = () => {
    setSelectedEmpleadoId(null)
    setIsFormOpen(false)
  }

  const closeDetail = () => {
    setDetailEmpleadoId(null)
    setIsDetailOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Empleados</h1>
          <p className="text-muted-foreground">
            Legajo RRHH modernizado con overlay local para paridad visual y funcional del legacy.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="bg-transparent">
            <Link href="/empleados/legajos">Legajos</Link>
          </Button>
          <Button asChild variant="outline" className="bg-transparent">
            <Link href="/empleados/liquidaciones">Nómina</Link>
          </Button>
          <Button variant="outline" className="bg-transparent" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refrescar API
          </Button>
          <Button
            onClick={() => {
              setSelectedEmpleadoId(null)
              setIsFormOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Empleado
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          title="Legajos visibles"
          value={totalCount}
          description="Incluye la página actual consultada a la API de empleados."
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Activos"
          value={activos.length}
          description="Dotación activa sobre la tanda visible."
          icon={<ShieldCheck className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Masa salarial"
          value={formatCurrency(payrollVisible)}
          description="Sólo contempla sueldo básico expuesto por la API actual."
          icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Altas 90 días"
          value={hiresLast90Days}
          description="Ingresos recientes con fecha de alta visible."
          icon={<BriefcaseBusiness className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Alertas de legajo"
          value={rosterAlerts.length}
          description="Faltan campos clave del bloque legacy o de la API."
          icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Legajos extendidos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Ruta dedicada a identidad, documentación, banco, obra social, convenio, fechas clave y
              demás bloques del viejo `frmEmpleado`.
            </p>
            <Button asChild>
              <Link href="/empleados/legajos">Abrir legajos</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nómina y liquidaciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Superficie nueva para liquidación, conceptos, recibos, vacaciones y licencias
              inspirada en `frmSueldos`.
            </p>
            <Button asChild>
              <Link href="/empleados/liquidaciones">Abrir nómina</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cobertura por sucursal</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Dotación</TableHead>
                  <TableHead>Activos</TableHead>
                  <TableHead>Nómina visible</TableHead>
                  <TableHead>Alertas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branchCoverage.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      Sin dotación asociada a sucursales activas.
                    </TableCell>
                  </TableRow>
                )}
                {branchCoverage.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell className="font-medium">{branch.descripcion}</TableCell>
                    <TableCell>{branch.total}</TableCell>
                    <TableCell>{branch.activos}</TableCell>
                    <TableCell>{formatCurrency(branch.payroll)}</TableCell>
                    <TableCell>
                      <Badge variant={branch.missingRoster > 0 ? "outline" : "secondary"}>
                        {branch.missingRoster > 0
                          ? `${branch.missingRoster} pendientes`
                          : "Completo"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ficha destacada</CardTitle>
          </CardHeader>
          <CardContent>
            {!featuredEmployee ? (
              <p className="text-sm text-muted-foreground">
                No hay empleados filtrados para destacar.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    Legajo activo
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">
                    {getDisplayName(featuredEmployee.empleado, featuredEmployee.profile)}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {featuredEmployee.empleado.legajo
                      ? `Legajo ${featuredEmployee.empleado.legajo}`
                      : `Tercero ${featuredEmployee.empleado.terceroId}`}
                  </p>
                </div>
                <DetailFieldGrid
                  fields={[
                    {
                      label: "Sucursal",
                      value:
                        sucursalMap.get(featuredEmployee.empleado.sucursalId) ??
                        `Sucursal ${featuredEmployee.empleado.sucursalId}`,
                    },
                    { label: "Categoría", value: featuredEmployee.empleado.categoria ?? "-" },
                    {
                      label: "Situación",
                      value: getRosterStatus(featuredEmployee.empleado, featuredEmployee.profile),
                    },
                    {
                      label: "Contacto principal",
                      value:
                        getPrimaryContact(featuredEmployee.profile)?.valor ||
                        "Sin contacto cargado",
                    },
                    {
                      label: "Área principal",
                      value: featuredEmployee.profile.areas[0] ?? "Sin área asignada",
                    },
                    {
                      label: "Condición fiscal",
                      value: featuredEmployee.profile.condicionFiscal || "Sin dato",
                    },
                  ]}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative min-w-72 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Buscar por nombre, documento, legajo o tercero..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Filtrar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="inactivo">Inactivo</SelectItem>
                <SelectItem value="suspendido">Suspendido</SelectItem>
                <SelectItem value="licencia">Licencia</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Legajo</TableHead>
                <TableHead>Empleado</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Situación</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    Cargando legajos y overlay local...
                  </TableCell>
                </TableRow>
              )}
              {!loading && filteredEmpleados.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    No hay empleados para la búsqueda actual.
                  </TableCell>
                </TableRow>
              )}
              {filteredEmpleados.map(({ empleado, profile }) => (
                <TableRow
                  key={empleado.id}
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => {
                    setDetailEmpleadoId(empleado.id)
                    setIsDetailOpen(true)
                  }}
                >
                  <TableCell className="font-mono">{empleado.legajo ?? "-"}</TableCell>
                  <TableCell>
                    <div className="font-medium">{getDisplayName(empleado, profile)}</div>
                    <div className="text-xs text-muted-foreground">
                      {profile.perfiles[0] ?? "Sin perfil"}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {profile.nroDocumento || empleado.cuit || "-"}
                  </TableCell>
                  <TableCell>
                    {sucursalMap.get(empleado.sucursalId) ?? `Sucursal ${empleado.sucursalId}`}
                  </TableCell>
                  <TableCell>{empleado.categoria ?? "-"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        getRosterStatus(empleado, profile) === "Completo"
                          ? "secondary"
                          : getRosterStatus(empleado, profile) === "Con alerta"
                            ? "outline"
                            : "destructive"
                      }
                    >
                      {getRosterStatus(empleado, profile)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={estadoVariant[empleado.estado] ?? "secondary"}>
                      {empleado.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDetailEmpleadoId(empleado.id)
                          setIsDetailOpen(true)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedEmpleadoId(empleado.id)
                          setIsFormOpen(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!open) closeForm()
          else setIsFormOpen(true)
        }}
      >
        <DialogContent className="max-h-[94vh] max-w-6xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEmpleado ? "Editar empleado" : "Nuevo empleado"}</DialogTitle>
            <DialogDescription>
              El lote 1 amplía la ficha RRHH con bloques legacy persistidos localmente mientras la
              API se mantiene mínima.
            </DialogDescription>
          </DialogHeader>

          <EmployeeForm
            key={`${selectedEmpleado?.id ?? "nuevo"}-${isFormOpen ? "open" : "closed"}`}
            empleado={selectedEmpleado}
            legacyProfile={
              selectedEmpleado
                ? (legacyProfiles[String(selectedEmpleado.id)] ??
                  buildDefaultLegacyProfile(selectedEmpleado))
                : buildDefaultLegacyProfile(null)
            }
            sucursales={sucursales}
            crear={crear}
            actualizar={actualizar}
            onClose={closeForm}
            onSaved={({ profile, employeeId }) => {
              if (employeeId) {
                handlePersistProfile(employeeId, profile)
              }

              closeForm()
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          if (!open) closeDetail()
          else setIsDetailOpen(true)
        }}
      >
        <DialogContent className="max-h-[94vh] max-w-6xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {detailEmpleado
                ? getDisplayName(
                    detailEmpleado,
                    legacyProfiles[String(detailEmpleado.id)] ??
                      buildDefaultLegacyProfile(detailEmpleado)
                  )
                : "Detalle empleado"}
            </DialogTitle>
            <DialogDescription>
              Vista consolidada entre API actual y overlay local del legajo histórico.
            </DialogDescription>
          </DialogHeader>

          {detailEmpleado && (
            <EmployeeDetail
              empleado={detailEmpleado}
              legacyProfile={
                legacyProfiles[String(detailEmpleado.id)] ??
                buildDefaultLegacyProfile(detailEmpleado)
              }
              sucursalNombre={
                sucursalMap.get(detailEmpleado.sucursalId) ??
                `Sucursal ${detailEmpleado.sucursalId}`
              }
            />
          )}

          <DialogFooter>
            <Button variant="outline" className="bg-transparent" onClick={closeDetail}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
