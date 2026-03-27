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
        Se persisten localmente los datos del circuito heredado para la devolución{" "}
        {row.id.toUpperCase()} hasta contar con endpoint específico de gestión por ítem.
      </div>

      <div className="grid gap-4 md:grid-cols-2">
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
        <div className="space-y-1.5">
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
        <Button onClick={() => onSave(profile)}>Guardar circuito legacy</Button>
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
          { label: "Cliente", value: highlighted.cliente },
          { label: "Factura origen", value: highlighted.factura },
          { label: "Remito asociado", value: highlighted.remito },
          { label: "Modalidad", value: highlightedProfile.modalidad },
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
            Circuito visible de devoluciones del legacy, con contexto operativo para factura, remito
            y resolución comercial mientras no exista endpoint de gestión por ítem.
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

      <div className="grid gap-4 md:grid-cols-4">
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
      </div>

      {highlighted ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardDescription>Devolución prioritaria</CardDescription>
            <CardTitle className="mt-1 text-xl">{highlighted.id.toUpperCase()}</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailFieldGrid fields={highlightedFields} />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="h-4 w-4" /> Cobertura legacy
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {configured} devoluciones ya tienen circuito heredado documentado con modalidad,
            resolución e inspección.
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
            mientras la devolución sigue en overlay local.
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
            Overlay local inspirado en los formularios legacy de devolución no valorizada y
            devolución con stock.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
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
        </CardContent>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalle de devolución</DialogTitle>
            <DialogDescription>
              Contexto operativo del circuito legacy y sus vínculos con documentos de ventas.
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <Tabs defaultValue="principal" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="principal">Principal</TabsTrigger>
                <TabsTrigger value="circuito">Circuito</TabsTrigger>
                <TabsTrigger value="resolucion">Resolución</TabsTrigger>
              </TabsList>
              <TabsContent value="principal" className="space-y-4 pt-4">
                <DetailFieldGrid
                  fields={[
                    { label: "Cliente", value: selected.cliente },
                    { label: "Fecha", value: selected.fecha },
                    { label: "Depósito", value: selected.deposito },
                    { label: "Total", value: formatMoney(selected.total) },
                    { label: "Factura origen", value: selected.factura },
                    { label: "Remito asociado", value: selected.remito },
                  ]}
                />
              </TabsContent>
              <TabsContent value="circuito" className="space-y-4 pt-4">
                <DetailFieldGrid
                  fields={[
                    { label: "Modalidad", value: getProfile(selected).modalidad },
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
            <DialogTitle>Editar circuito legacy</DialogTitle>
            <DialogDescription>
              Modalidad, inspección y resolución persistidas sólo en frontend hasta disponer de
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
