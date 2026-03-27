"use client"

import { useMemo, useState } from "react"
import { Mail, PencilLine, Phone, Plus, Search, Trash2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useLegacyLocalCollection } from "@/lib/hooks/useLegacyLocalCollection"
import { useSucursales } from "@/lib/hooks/useSucursales"
import { legacySucursalContacts, type LegacySucursalContact } from "@/lib/legacy-masters-data"
import type { CreateSucursalDto, Sucursal } from "@/lib/types/sucursales"

type BranchFormState = CreateSucursalDto & {
  id?: number
}

type ContactFormState = {
  id?: string
  sucursalId: string
  nombre: string
  cargo: string
  email: string
  telefono: string
  circuito: string
}

const initialBranchForm: BranchFormState = {
  descripcion: "",
  razonSocial: "",
  cuit: "",
  direccion: "",
  codigoPostal: "",
  telefono: "",
  email: "",
}

const initialContactForm: ContactFormState = {
  sucursalId: "",
  nombre: "",
  cargo: "",
  email: "",
  telefono: "",
  circuito: "",
}

export default function SucursalesPage() {
  const { sucursales, loading, error, crear, actualizar, eliminar } = useSucursales(false)
  const { rows: contacts, setRows: setContacts } = useLegacyLocalCollection<LegacySucursalContact>(
    "legacy-sucursal-contacts",
    legacySucursalContacts
  )
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"todas" | "activas" | "inactivas">("todas")
  const [selectedSucursalId, setSelectedSucursalId] = useState<number | null>(null)
  const [isBranchDialogOpen, setIsBranchDialogOpen] = useState(false)
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false)
  const [branchForm, setBranchForm] = useState<BranchFormState>(initialBranchForm)
  const [contactForm, setContactForm] = useState<ContactFormState>(initialContactForm)
  const [saving, setSaving] = useState(false)

  const filteredBranches = useMemo(() => {
    const term = search.trim().toLowerCase()
    return sucursales.filter((row) => {
      const matchesSearch =
        !term ||
        row.descripcion.toLowerCase().includes(term) ||
        (row.razonSocial ?? "").toLowerCase().includes(term) ||
        (row.email ?? "").toLowerCase().includes(term) ||
        (row.cuit ?? "").toLowerCase().includes(term)

      if (statusFilter === "activas") return matchesSearch && row.activo
      if (statusFilter === "inactivas") return matchesSearch && !row.activo
      return matchesSearch
    })
  }, [search, statusFilter, sucursales])

  const highlighted =
    filteredBranches.find((row) => row.id === selectedSucursalId) ?? filteredBranches[0] ?? null

  const branchContacts = useMemo(() => {
    if (!highlighted) {
      return []
    }

    return contacts.filter((row) => row.sucursalId === highlighted.id)
  }, [contacts, highlighted])

  function openCreateBranchDialog() {
    setBranchForm(initialBranchForm)
    setIsBranchDialogOpen(true)
  }

  function openEditBranchDialog(row: Sucursal) {
    setBranchForm({
      id: row.id,
      descripcion: row.descripcion,
      razonSocial: row.razonSocial ?? "",
      cuit: row.cuit ?? "",
      direccion: row.direccion ?? "",
      codigoPostal: row.codigoPostal ?? "",
      telefono: row.telefono ?? "",
      email: row.email ?? "",
    })
    setIsBranchDialogOpen(true)
  }

  async function saveBranch() {
    if (!branchForm.descripcion.trim()) {
      return
    }

    setSaving(true)
    const payload: CreateSucursalDto = {
      descripcion: branchForm.descripcion,
      razonSocial: branchForm.razonSocial,
      cuit: branchForm.cuit,
      direccion: branchForm.direccion,
      codigoPostal: branchForm.codigoPostal,
      telefono: branchForm.telefono,
      email: branchForm.email,
    }

    const ok = branchForm.id ? await actualizar(branchForm.id, payload) : await crear(payload)

    setSaving(false)
    if (ok) {
      setIsBranchDialogOpen(false)
    }
  }

  async function deactivateBranch(id: number) {
    const confirmed = window.confirm("Se desactivara la sucursal seleccionada. Continuar?")
    if (!confirmed) {
      return
    }

    setSaving(true)
    const ok = await eliminar(id)
    setSaving(false)
    if (ok && selectedSucursalId === id) {
      setSelectedSucursalId(null)
    }
  }

  function openCreateContactDialog() {
    setContactForm({
      ...initialContactForm,
      sucursalId: highlighted ? String(highlighted.id) : "",
    })
    setIsContactDialogOpen(true)
  }

  function saveContact() {
    const parsedBranchId = Number(contactForm.sucursalId)
    if (!parsedBranchId || !contactForm.nombre.trim() || !contactForm.circuito.trim()) {
      return
    }

    const nextContact: LegacySucursalContact = {
      id: contactForm.id ?? globalThis.crypto.randomUUID(),
      sucursalId: parsedBranchId,
      nombre: contactForm.nombre,
      cargo: contactForm.cargo,
      email: contactForm.email,
      telefono: contactForm.telefono,
      circuito: contactForm.circuito,
    }

    setContacts((current) => {
      if (!contactForm.id) {
        return [nextContact, ...current]
      }

      return current.map((row) => (row.id === contactForm.id ? nextContact : row))
    })
    setIsContactDialogOpen(false)
  }

  function removeContact(id: string) {
    setContacts((current) => current.filter((row) => row.id !== id))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sucursales</h1>
        <p className="mt-1 text-muted-foreground">
          Maestro principal de sedes con CRUD real sobre la API existente. Los contactos de colegio
          y su circuito operacional siguen como overlay local mientras no exista una relacion
          backend dedicada.
        </p>
      </div>

      <Alert>
        <AlertTitle>Modelo mixto</AlertTitle>
        <AlertDescription>
          Los datos basicos de la sucursal usan backend real. Los contactos heredados de
          `frmSucursalesContactosColegio` se administran en esta vista de forma local y explicita.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sucursales visibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : filteredBranches.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sucursales.filter((row) => row.activo).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Contactos legacy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contacts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Circuitos cubiertos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(contacts.map((row) => row.circuito)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <CardTitle>Padron de sedes</CardTitle>
                <CardDescription>API real para alta, edicion y desactivacion.</CardDescription>
              </div>
              <Button onClick={openCreateBranchDialog}>
                <Plus className="mr-2 h-4 w-4" /> Nueva sucursal
              </Button>
            </div>
            <div className="grid gap-3 pt-2 md:grid-cols-[1.4fr_0.8fr]">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por descripcion, razon social, CUIT o email..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="activas">Solo activas</SelectItem>
                  <SelectItem value="inactivas">Solo inactivas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descripcion</TableHead>
                  <TableHead>Razon social</TableHead>
                  <TableHead>CUIT</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBranches.map((row) => (
                  <TableRow
                    key={row.id}
                    onClick={() => setSelectedSucursalId(row.id)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-medium">{row.descripcion}</TableCell>
                    <TableCell>{row.razonSocial ?? "-"}</TableCell>
                    <TableCell>{row.cuit ?? "-"}</TableCell>
                    <TableCell>{row.email ?? row.telefono ?? "-"}</TableCell>
                    <TableCell>
                      {row.activo ? (
                        <Badge>Activa</Badge>
                      ) : (
                        <Badge variant="outline">Inactiva</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditBranchDialog(row)}>
                          <PencilLine className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deactivateBranch(row.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Sucursal destacada</CardTitle>
                  <CardDescription>Detalle operativo y overlay de contactos.</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openCreateContactDialog}
                  disabled={!highlighted}
                >
                  <Plus className="mr-2 h-4 w-4" /> Contacto
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {highlighted ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{highlighted.descripcion}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {highlighted.razonSocial ?? "Sin razon social visible"}
                      </p>
                    </div>
                    {highlighted.activo ? (
                      <Badge>Activa</Badge>
                    ) : (
                      <Badge variant="outline">Inactiva</Badge>
                    )}
                  </div>
                  <div className="grid gap-3">
                    <div className="rounded-lg border p-3 text-sm">
                      <p className="text-muted-foreground">Direccion</p>
                      <p className="mt-2 font-medium">{highlighted.direccion ?? "Sin direccion"}</p>
                    </div>
                    <div className="rounded-lg border p-3 text-sm">
                      <p className="text-muted-foreground">Contacto principal</p>
                      <div className="mt-2 space-y-2">
                        <p className="flex items-center gap-2">
                          <Mail className="h-4 w-4" /> {highlighted.email ?? "Sin email"}
                        </p>
                        <p className="flex items-center gap-2">
                          <Phone className="h-4 w-4" /> {highlighted.telefono ?? "Sin telefono"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Contactos colegio</p>
                    {branchContacts.length ? (
                      branchContacts.map((contact) => (
                        <div key={contact.id} className="rounded-lg border p-3 text-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">{contact.nombre}</p>
                              <p className="mt-1 text-muted-foreground">{contact.cargo}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeContact(contact.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="mt-3 text-muted-foreground">{contact.circuito}</p>
                          <p className="mt-2">{contact.email || "Sin email"}</p>
                          <p>{contact.telefono || "Sin telefono"}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No hay contactos overlay para esta sucursal.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No hay sucursales visibles.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isBranchDialogOpen} onOpenChange={setIsBranchDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{branchForm.id ? "Editar sucursal" : "Nueva sucursal"}</DialogTitle>
            <DialogDescription>
              Este formulario usa la API real ya existente para el maestro de sucursales.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Descripcion</label>
              <Input
                value={branchForm.descripcion}
                onChange={(event) =>
                  setBranchForm((current) => ({ ...current, descripcion: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Razon social</label>
              <Input
                value={branchForm.razonSocial ?? ""}
                onChange={(event) =>
                  setBranchForm((current) => ({ ...current, razonSocial: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">CUIT</label>
              <Input
                value={branchForm.cuit ?? ""}
                onChange={(event) =>
                  setBranchForm((current) => ({ ...current, cuit: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Codigo postal</label>
              <Input
                value={branchForm.codigoPostal ?? ""}
                onChange={(event) =>
                  setBranchForm((current) => ({ ...current, codigoPostal: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Direccion</label>
              <Textarea
                rows={3}
                value={branchForm.direccion ?? ""}
                onChange={(event) =>
                  setBranchForm((current) => ({ ...current, direccion: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Telefono</label>
              <Input
                value={branchForm.telefono ?? ""}
                onChange={(event) =>
                  setBranchForm((current) => ({ ...current, telefono: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                value={branchForm.email ?? ""}
                onChange={(event) =>
                  setBranchForm((current) => ({ ...current, email: event.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBranchDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveBranch} disabled={saving}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo contacto de colegio</DialogTitle>
            <DialogDescription>
              Overlay local para cubrir el viejo formulario de contactos por sucursal.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sucursal</label>
              <Select
                value={contactForm.sucursalId}
                onValueChange={(value) =>
                  setContactForm((current) => ({ ...current, sucursalId: value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {sucursales.map((branch) => (
                    <SelectItem key={branch.id} value={String(branch.id)}>
                      {branch.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre</label>
              <Input
                value={contactForm.nombre}
                onChange={(event) =>
                  setContactForm((current) => ({ ...current, nombre: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cargo</label>
              <Input
                value={contactForm.cargo}
                onChange={(event) =>
                  setContactForm((current) => ({ ...current, cargo: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Circuito</label>
              <Input
                value={contactForm.circuito}
                onChange={(event) =>
                  setContactForm((current) => ({ ...current, circuito: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                value={contactForm.email}
                onChange={(event) =>
                  setContactForm((current) => ({ ...current, email: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Telefono</label>
              <Input
                value={contactForm.telefono}
                onChange={(event) =>
                  setContactForm((current) => ({ ...current, telefono: event.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsContactDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveContact}>Guardar contacto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
