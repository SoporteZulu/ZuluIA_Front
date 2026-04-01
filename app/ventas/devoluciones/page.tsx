"use client"

import Link from "next/link"
import { useState } from "react"
import { Eye, FileText, RotateCcw, Search, Filter, Edit, ClipboardCheck, Undo2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLegacyLocalCollection } from "@/lib/hooks/useLegacyLocalCollection"
import { useComprobantes } from "@/lib/hooks/useComprobantes"
import { legacySalesReturns, type LegacySalesReturn } from "@/lib/ventas-legacy-data"
import {
  buildLegacyReturnProfile,
  type LegacyReturnProfile,
  type LegacyReturnResolutionLine,
} from "@/lib/ventas-devoluciones-legacy"

function formatMoney(value: number) {
  return value.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  })
}

function statusBadge(status: LegacySalesReturn["estado"]) {
  if (status === "ABIERTA") return <Badge variant="secondary">Abierta</Badge>
  if (status === "APROBADA") return <Badge>Aprobada</Badge>
  return <Badge variant="outline">Cerrada</Badge>
}

function priorityBadge(priority: LegacyReturnProfile["prioridad"]) {
  if (priority === "Alta") return <Badge variant="destructive">Alta</Badge>
  if (priority === "Media") return <Badge variant="secondary">Media</Badge>
  return <Badge variant="outline">Baja</Badge>
}

function createResolutionLine(): LegacyReturnResolutionLine {
  return {
    id: `return-line-${globalThis.crypto.randomUUID()}`,
    descripcion: "",
    accion: "",
    cantidad: "1",
  }
}

function DetailFieldGrid({ fields }: { fields: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {fields.map((field) => (
        <div key={field.label} className="rounded-lg bg-muted/40 p-3">
          <span className="mb-1 block text-xs text-muted-foreground">{field.label}</span>
          <p className="text-sm font-medium wrap-break-word">{field.value}</p>
        </div>
      ))}
    </div>
  )
}

function LegacyReturnDialog({
  row,
  initialProfile,
  onClose,
  onSave,
}: {
  row: LegacySalesReturn
  initialProfile: LegacyReturnProfile
  onClose: () => void
  onSave: (profile: LegacyReturnProfile) => void
}) {
  const [profile, setProfile] = useState<LegacyReturnProfile>(initialProfile)

  const set = (
    key: keyof LegacyReturnProfile,
    value: string | boolean | LegacyReturnResolutionLine[]
  ) => {
    setProfile((prev) => ({ ...prev, [key]: value }))
  }

  const updateItem = (id: string, patch: Partial<LegacyReturnResolutionLine>) => {
    setProfile((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }))
  }

  const removeItem = (id: string) => {
    setProfile((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }))
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
        La cabecera comercial, fiscal y logística de la devolución {row.id.toUpperCase()} se
        completa localmente hasta contar con un endpoint específico de gestión por ítem y
        resolución.
      </div>

      <Tabs defaultValue="cliente" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cliente">Cliente</TabsTrigger>
          <TabsTrigger value="comprobante">Comprobante</TabsTrigger>
          <TabsTrigger value="resolucion">Resolución</TabsTrigger>
        </TabsList>

        <TabsContent value="cliente" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Sucursal</Label>
              <Input
                value={profile.sucursal}
                onChange={(event) => set("sucursal", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Condición IVA</Label>
              <Input
                value={profile.condicionIva}
                onChange={(event) => set("condicionIva", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>CUIT</Label>
              <Input value={profile.cuit} onChange={(event) => set("cuit", event.target.value)} />
            </div>
            <div className="space-y-1.5 xl:col-span-2">
              <Label>Calle</Label>
              <Input value={profile.calle} onChange={(event) => set("calle", event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input
                value={profile.telefono}
                onChange={(event) => set("telefono", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Localidad</Label>
              <Input
                value={profile.localidad}
                onChange={(event) => set("localidad", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Provincia</Label>
              <Input
                value={profile.provincia}
                onChange={(event) => set("provincia", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Código postal</Label>
              <Input
                value={profile.codigoPostal}
                onChange={(event) => set("codigoPostal", event.target.value)}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="comprobante" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tipo de comprobante</Label>
              <Input
                value={profile.tipoComprobante}
                onChange={(event) => set("tipoComprobante", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Número</Label>
              <Input
                value={profile.numeroComprobante}
                onChange={(event) => set("numeroComprobante", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Modalidad</Label>
              <Select value={profile.modalidad} onValueChange={(value) => set("modalidad", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="No valorizada">No valorizada</SelectItem>
                  <SelectItem value="Con stock">Con stock</SelectItem>
                  <SelectItem value="Mixta">Mixta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prioridad</Label>
              <Select value={profile.prioridad} onValueChange={(value) => set("prioridad", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Alta">Alta</SelectItem>
                  <SelectItem value="Media">Media</SelectItem>
                  <SelectItem value="Baja">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Condición de venta</Label>
              <Input
                value={profile.condicionVenta}
                onChange={(event) => set("condicionVenta", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha de vencimiento</Label>
              <Input
                type="date"
                value={profile.fechaVencimiento}
                onChange={(event) => set("fechaVencimiento", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Lista de precios</Label>
              <Input
                value={profile.listaPrecios}
                onChange={(event) => set("listaPrecios", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Canal de ingreso</Label>
              <Input
                value={profile.canalIngreso}
                onChange={(event) => set("canalIngreso", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sector responsable</Label>
              <Input
                value={profile.sectorResponsable}
                onChange={(event) => set("sectorResponsable", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Depósito destino</Label>
              <Input
                value={profile.depositoDestino}
                onChange={(event) => set("depositoDestino", event.target.value)}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Observación del comprobante</Label>
              <Textarea
                value={profile.observacionComprobante}
                onChange={(event) => set("observacionComprobante", event.target.value)}
                rows={3}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="resolucion" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Condición de mercadería</Label>
              <Input
                value={profile.condicionMercaderia}
                onChange={(event) => set("condicionMercaderia", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Autorizado por</Label>
              <Input
                value={profile.autorizadoPor}
                onChange={(event) => set("autorizadoPor", event.target.value)}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Referencia de nota de crédito</Label>
              <Input
                value={profile.notaCreditoReferencia}
                onChange={(event) => set("notaCreditoReferencia", event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">Requiere retiro</p>
                <p className="text-sm text-muted-foreground">
                  Retiro coordinado con transporte o cliente.
                </p>
              </div>
              <Switch
                checked={profile.requiereRetiro}
                onCheckedChange={(value) => set("requiereRetiro", value)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">Genera nota de crédito</p>
                <p className="text-sm text-muted-foreground">Resolución comercial asociada.</p>
              </div>
              <Switch
                checked={profile.generaNotaCredito}
                onCheckedChange={(value) => set("generaNotaCredito", value)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">Reingresa stock</p>
                <p className="text-sm text-muted-foreground">Impacto logístico visible.</p>
              </div>
              <Switch
                checked={profile.reingresaStock}
                onCheckedChange={(value) => set("reingresaStock", value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Causa raíz</Label>
            <Textarea
              value={profile.causaRaiz}
              onChange={(event) => set("causaRaiz", event.target.value)}
              rows={3}
            />
          </div>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Ítems y resolución</CardTitle>
            <CardDescription>
              Detalle local del circuito de inspección y resolución.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            className="bg-transparent"
            onClick={() => set("items", [...profile.items, createResolutionLine()])}
          >
            Agregar línea
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {profile.items.length > 0 ? (
            profile.items.map((item) => (
              <div
                key={item.id}
                className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1.4fr_1fr_120px_auto]"
              >
                <Input
                  value={item.descripcion}
                  onChange={(event) => updateItem(item.id, { descripcion: event.target.value })}
                  placeholder="Descripción"
                />
                <Input
                  value={item.accion}
                  onChange={(event) => updateItem(item.id, { accion: event.target.value })}
                  placeholder="Acción"
                />
                <Input
                  value={item.cantidad}
                  onChange={(event) => updateItem(item.id, { cantidad: event.target.value })}
                  placeholder="Cantidad"
                />
                <Button type="button" variant="ghost" onClick={() => removeItem(item.id)}>
                  Quitar
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Sin líneas cargadas.</p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-1.5">
        <Label>Observaciones</Label>
        <Textarea
          value={profile.observaciones}
          onChange={(event) => set("observaciones", event.target.value)}
          rows={4}
        />
      </div>

      <DialogFooter>
        <Button variant="outline" className="bg-transparent" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={() => onSave(profile)}>Guardar devolución</Button>
      </DialogFooter>
    </div>
  )
}

export default function VentasDevolucionesPage() {
  const { comprobantes } = useComprobantes({ esVenta: true })
  const { rows: legacyProfiles, setRows: setLegacyProfiles } =
    useLegacyLocalCollection<LegacyReturnProfile>("ventas-devoluciones-legacy", [])
  const [selected, setSelected] = useState<LegacySalesReturn | null>(null)
  const [editing, setEditing] = useState<LegacySalesReturn | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterEstado, setFilterEstado] = useState("todos")
  const [filterModalidad, setFilterModalidad] = useState("todos")

  const normalizedSearchTerm = searchTerm.toLowerCase().trim()
  const legacyById = new Map(legacyProfiles.map((profile) => [profile.returnId, profile]))

  const getProfile = (row: LegacySalesReturn) => {
    return legacyById.get(row.id) ?? buildLegacyReturnProfile(row)
  }

  const saveProfile = (profile: LegacyReturnProfile) => {
    setLegacyProfiles((prev) => {
      const index = prev.findIndex((row) => row.returnId === profile.returnId)
      if (index === -1) return [...prev, profile]
      return prev.map((row) => (row.returnId === profile.returnId ? profile : row))
    })
    setEditing(null)
  }

  const filtered = legacySalesReturns.filter((row) => {
    const profile = getProfile(row)
    const matchesSearch =
      normalizedSearchTerm === "" ||
      row.id.toLowerCase().includes(normalizedSearchTerm) ||
      row.cliente.toLowerCase().includes(normalizedSearchTerm) ||
      row.factura.toLowerCase().includes(normalizedSearchTerm) ||
      row.remito.toLowerCase().includes(normalizedSearchTerm) ||
      row.motivo.toLowerCase().includes(normalizedSearchTerm) ||
      profile.canalIngreso.toLowerCase().includes(normalizedSearchTerm) ||
      profile.sectorResponsable.toLowerCase().includes(normalizedSearchTerm)

    const matchesEstado = filterEstado === "todos" || row.estado === filterEstado
    const matchesModalidad = filterModalidad === "todos" || profile.modalidad === filterModalidad

    return matchesSearch && matchesEstado && matchesModalidad
  })

  const highlighted =
    filtered.find((row) => row.estado === "ABIERTA") ?? filtered[0] ?? legacySalesReturns[0] ?? null

  const totals = {
    total: legacySalesReturns.length,
    abiertas: legacySalesReturns.filter((row) => row.estado === "ABIERTA").length,
    aprobadas: legacySalesReturns.filter((row) => row.estado === "APROBADA").length,
    importe: legacySalesReturns.reduce((sum, row) => sum + row.total, 0),
  }
  const configured = legacySalesReturns.filter((row) => legacyById.has(row.id)).length
  const withCreditNote = legacyProfiles.filter((profile) => profile.generaNotaCredito).length
  const withStockReentry = legacyProfiles.filter((profile) => profile.reingresaStock).length
  const linkedDocuments = comprobantes.filter(
    (row) => row.estado !== "ANULADO" && (row.nroComprobante ?? "").trim() !== ""
  ).length
  const highlightedProfile = highlighted ? getProfile(highlighted) : null
  const highlightedFields =
    highlighted && highlightedProfile
      ? [
          { label: "Comprobante", value: highlightedProfile.tipoComprobante },
          { label: "Número", value: highlightedProfile.numeroComprobante },
          { label: "Cliente", value: highlighted.cliente },
          { label: "Factura origen", value: highlighted.factura },
          { label: "Remito asociado", value: highlighted.remito },
          { label: "Modalidad", value: highlightedProfile.modalidad },
          { label: "Prioridad", value: highlightedProfile.prioridad },
          { label: "Canal", value: highlightedProfile.canalIngreso || "No informado" },
          { label: "Sector", value: highlightedProfile.sectorResponsable || "No informado" },
          {
            label: "Resolución",
            value: highlightedProfile.generaNotaCredito
              ? highlightedProfile.notaCreditoReferencia || "Genera nota de crédito"
              : "Sin nota de crédito",
          },
          {
            label: "Logística",
            value: highlightedProfile.reingresaStock
              ? `Reingresa a ${highlightedProfile.depositoDestino || highlighted.deposito}`
              : "Sin reingreso de stock",
          },
        ]
      : []

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Devoluciones</h1>
          <p className="mt-1 text-muted-foreground">
            Gestión comercial y logística de devoluciones con cabecera documental, cliente,
            resolución e impacto en stock visibles en una sola vista. El seguimiento por ítem sigue
            coordinándose localmente hasta contar con backend específico.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/ventas/notas-credito">
            <Button variant="outline" className="bg-transparent">
              Notas de crédito
            </Button>
          </Link>
          <Link href="/ventas/remitos">
            <Button className="bg-slate-900 text-white hover:bg-slate-800">Ver remitos</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Devoluciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Abiertas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{totals.abiertas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Aprobadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{totals.aprobadas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Importe visible</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(totals.importe)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Fichas completas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-sky-700">{configured}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Con nota de crédito</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">{withCreditNote}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Con reingreso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-700">{withStockReentry}</div>
          </CardContent>
        </Card>
      </div>

      {highlighted ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardDescription>Devolución prioritaria</CardDescription>
              <CardTitle className="mt-1 text-xl">
                {highlighted.cliente} · {highlighted.id.toUpperCase()}
              </CardTitle>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                {highlighted.motivo}. La devolución se procesa como{" "}
                {highlightedProfile?.modalidad.toLowerCase() ?? "modalidad no informada"}, con
                comprobante {highlightedProfile?.tipoComprobante ?? "sin tipo"} y depósito destino{" "}
                {highlightedProfile?.depositoDestino || highlighted.deposito}.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {statusBadge(highlighted.estado)}
                {highlightedProfile ? priorityBadge(highlightedProfile.prioridad) : null}
                <Badge variant="outline">{formatMoney(highlighted.total)}</Badge>
                <Badge variant="outline">
                  {highlightedProfile?.generaNotaCredito
                    ? highlightedProfile.notaCreditoReferencia || "Con nota de crédito"
                    : "Sin nota de crédito"}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={highlightedFields} />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="h-4 w-4" /> Cobertura operativa
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {configured} devoluciones ya tienen ficha operativa documentada con modalidad, cabecera
            comercial, resolución e inspección.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" /> Resolución comercial
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {withCreditNote} devoluciones marcan emisión de nota de crédito y {withStockReentry}{" "}
            prevén reingreso a stock.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Undo2 className="h-4 w-4" /> Contexto vivo
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Hay {linkedDocuments} comprobantes de venta visibles para cruzar el circuito documental
            mientras la resolución detallada sigue administrándose localmente.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cabecera documental</CardTitle>
            <CardDescription>
              Campos visibles inspirados en el formulario histórico de devolución de ventas.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Cliente y fiscal
              </p>
              <p className="mt-1 font-medium text-foreground wrap-break-word">
                {highlightedProfile
                  ? `${highlighted.cliente} · ${highlightedProfile.condicionIva}`
                  : "Sin devolución destacada"}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Comprobante
              </p>
              <p className="mt-1 font-medium text-foreground wrap-break-word">
                {highlightedProfile
                  ? `${highlightedProfile.tipoComprobante} ${highlightedProfile.numeroComprobante}`
                  : "Sin cabecera"}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Condición comercial
              </p>
              <p className="mt-1 font-medium text-foreground wrap-break-word">
                {highlightedProfile
                  ? `${highlightedProfile.condicionVenta} · ${highlightedProfile.listaPrecios}`
                  : "Sin condición comercial"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-[1fr_220px_220px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, factura, remito o canal..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ABIERTA">Abierta</SelectItem>
                <SelectItem value="APROBADA">Aprobada</SelectItem>
                <SelectItem value="CERRADA">Cerrada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterModalidad} onValueChange={setFilterModalidad}>
              <SelectTrigger>
                <SelectValue placeholder="Modalidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="No valorizada">No valorizada</SelectItem>
                <SelectItem value="Con stock">Con stock</SelectItem>
                <SelectItem value="Mixta">Mixta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" /> Devoluciones visibles
          </CardTitle>
          <CardDescription>
            Vista operativa inspirada en los formularios históricos de devolución no valorizada y
            con stock.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Comprobante</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Factura</TableHead>
                  <TableHead>Remito</TableHead>
                  <TableHead>Modalidad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.id.toUpperCase()}</TableCell>
                    <TableCell className="wrap-break-word">
                      {getProfile(row).tipoComprobante} {getProfile(row).numeroComprobante}
                    </TableCell>
                    <TableCell>{row.cliente}</TableCell>
                    <TableCell>{row.factura}</TableCell>
                    <TableCell>{row.remito}</TableCell>
                    <TableCell>{getProfile(row).modalidad}</TableCell>
                    <TableCell>{statusBadge(row.estado)}</TableCell>
                    <TableCell className="text-right">{formatMoney(row.total)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setSelected(row)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setEditing(row)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalle de devolución</DialogTitle>
            <DialogDescription>
              Cabecera documental, circuito comercial y resolución visible de la devolución.
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <Tabs defaultValue="principal" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="principal">Cliente</TabsTrigger>
                <TabsTrigger value="circuito">Comprobante</TabsTrigger>
                <TabsTrigger value="resolucion">Resolución</TabsTrigger>
              </TabsList>
              <TabsContent value="principal" className="space-y-4 pt-4">
                <DetailFieldGrid
                  fields={[
                    { label: "Cliente", value: selected.cliente },
                    { label: "Sucursal", value: getProfile(selected).sucursal || "No informada" },
                    {
                      label: "Condición IVA",
                      value: getProfile(selected).condicionIva || "No informada",
                    },
                    { label: "CUIT", value: getProfile(selected).cuit || "No informado" },
                    {
                      label: "Dirección",
                      value:
                        [
                          getProfile(selected).calle,
                          getProfile(selected).localidad,
                          getProfile(selected).provincia,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "No informada",
                    },
                    { label: "Teléfono", value: getProfile(selected).telefono || "No informado" },
                  ]}
                />
              </TabsContent>
              <TabsContent value="circuito" className="space-y-4 pt-4">
                <DetailFieldGrid
                  fields={[
                    { label: "Fecha", value: selected.fecha },
                    { label: "Comprobante", value: getProfile(selected).tipoComprobante },
                    { label: "Número", value: getProfile(selected).numeroComprobante },
                    { label: "Total", value: formatMoney(selected.total) },
                    { label: "Factura origen", value: selected.factura },
                    { label: "Remito asociado", value: selected.remito },
                    { label: "Modalidad", value: getProfile(selected).modalidad },
                    {
                      label: "Condición de venta",
                      value: getProfile(selected).condicionVenta || "No informada",
                    },
                    {
                      label: "Lista de precios",
                      value: getProfile(selected).listaPrecios || "No informada",
                    },
                    {
                      label: "Fecha de vencimiento",
                      value: getProfile(selected).fechaVencimiento || "No informada",
                    },
                    { label: "Canal", value: getProfile(selected).canalIngreso || "No informado" },
                    {
                      label: "Sector",
                      value: getProfile(selected).sectorResponsable || "No informado",
                    },
                    {
                      label: "Condición",
                      value: getProfile(selected).condicionMercaderia || "No informada",
                    },
                    {
                      label: "Depósito destino",
                      value: getProfile(selected).depositoDestino || selected.deposito,
                    },
                    {
                      label: "Autorizado por",
                      value: getProfile(selected).autorizadoPor || "Pendiente",
                    },
                  ]}
                />
              </TabsContent>
              <TabsContent value="resolucion" className="space-y-4 pt-4">
                <DetailFieldGrid
                  fields={[
                    { label: "Motivo", value: selected.motivo },
                    {
                      label: "Causa raíz",
                      value: getProfile(selected).causaRaiz || selected.motivo,
                    },
                    {
                      label: "Nota de crédito",
                      value: getProfile(selected).generaNotaCredito
                        ? getProfile(selected).notaCreditoReferencia || "Sí, pendiente de emisión"
                        : "No",
                    },
                    {
                      label: "Reingresa stock",
                      value: getProfile(selected).reingresaStock ? "Sí" : "No",
                    },
                  ]}
                />
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Líneas de resolución</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {getProfile(selected).items.map((item) => (
                      <div key={item.id} className="rounded-lg border bg-muted/30 p-3">
                        <p className="font-medium">{item.descripcion || "Línea sin descripción"}</p>
                        <p className="text-sm text-muted-foreground">
                          Acción: {item.accion || "Sin acción"} · Cantidad: {item.cantidad || "-"}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <div className="flex flex-wrap gap-2">
                  <Link href="/ventas/facturas">
                    <Button variant="outline" className="bg-transparent">
                      Ir a facturas
                    </Button>
                  </Link>
                  <Link href="/ventas/remitos">
                    <Button variant="outline" className="bg-transparent">
                      Ir a remitos
                    </Button>
                  </Link>
                  <Link href="/ventas/notas-credito">
                    <Button>Resolver con nota de crédito</Button>
                  </Link>
                </div>
              </TabsContent>
            </Tabs>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar devolución</DialogTitle>
            <DialogDescription>
              Cabecera, inspección y resolución persistidas sólo en frontend hasta disponer de
              backend específico.
            </DialogDescription>
          </DialogHeader>
          {editing ? (
            <LegacyReturnDialog
              row={editing}
              initialProfile={getProfile(editing)}
              onClose={() => setEditing(null)}
              onSave={saveProfile}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
