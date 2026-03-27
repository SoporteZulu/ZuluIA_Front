"use client"

import Link from "next/link"
import { useState } from "react"
import {
  Eye,
  Percent,
  Scale,
  Tag,
  Search,
  Filter,
  Edit,
  ReceiptText,
  ShieldCheck,
} from "lucide-react"

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
import { useComprobantes } from "@/lib/hooks/useComprobantes"
import { useLegacyLocalCollection } from "@/lib/hooks/useLegacyLocalCollection"
import { legacySalesAdjustments, type LegacySalesAdjustment } from "@/lib/ventas-legacy-data"
import {
  buildLegacyAdjustmentProfile,
  type LegacyAdjustmentAction,
  type LegacyAdjustmentProfile,
} from "@/lib/ventas-ajustes-legacy"

function formatMoney(value: number) {
  return value.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  })
}

function statusBadge(status: LegacySalesAdjustment["estado"]) {
  if (status === "BORRADOR") return <Badge variant="secondary">Borrador</Badge>
  if (status === "EMITIDO") return <Badge>Emitido</Badge>
  return <Badge variant="outline">Aplicado</Badge>
}

function createAdjustmentAction(): LegacyAdjustmentAction {
  return {
    id: `adjustment-action-${globalThis.crypto.randomUUID()}`,
    descripcion: "",
    destino: "",
    importe: "",
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

function LegacyAdjustmentDialog({
  initialProfile,
  onClose,
  onSave,
}: {
  initialProfile: LegacyAdjustmentProfile
  onClose: () => void
  onSave: (profile: LegacyAdjustmentProfile) => void
}) {
  const [profile, setProfile] = useState<LegacyAdjustmentProfile>(initialProfile)

  const set = (
    key: keyof LegacyAdjustmentProfile,
    value: string | boolean | LegacyAdjustmentAction[]
  ) => {
    setProfile((prev) => ({ ...prev, [key]: value }))
  }

  const updateAction = (id: string, patch: Partial<LegacyAdjustmentAction>) => {
    setProfile((prev) => ({
      ...prev,
      acciones: prev.acciones.map((action) =>
        action.id === id ? { ...action, ...patch } : action
      ),
    }))
  }

  const removeAction = (id: string) => {
    setProfile((prev) => ({
      ...prev,
      acciones: prev.acciones.filter((action) => action.id !== id),
    }))
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Origen</Label>
          <Select value={profile.origen} onValueChange={(value) => set("origen", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Punto de venta">Punto de venta</SelectItem>
              <SelectItem value="Comercial">Comercial</SelectItem>
              <SelectItem value="Fiscal">Fiscal</SelectItem>
              <SelectItem value="Logístico">Logístico</SelectItem>
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
          <Label>Resolución</Label>
          <Select value={profile.resolucion} onValueChange={(value) => set("resolucion", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Nota de crédito">Nota de crédito</SelectItem>
              <SelectItem value="Nota de débito">Nota de débito</SelectItem>
              <SelectItem value="Ajuste interno">Ajuste interno</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Punto de venta</Label>
          <Input
            value={profile.puntoVenta}
            onChange={(event) => set("puntoVenta", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Canal</Label>
          <Input value={profile.canal} onChange={(event) => set("canal", event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Autorizado por</Label>
          <Input
            value={profile.autorizadoPor}
            onChange={(event) => set("autorizadoPor", event.target.value)}
          />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Documento de referencia</Label>
          <Input
            value={profile.documentoReferencia}
            onChange={(event) => set("documentoReferencia", event.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="font-medium">Requiere aprobación</p>
            <p className="text-sm text-muted-foreground">
              Visible para ajustes comerciales/fiscales sensibles.
            </p>
          </div>
          <Switch
            checked={profile.requiereAprobacion}
            onCheckedChange={(value) => set("requiereAprobacion", value)}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="font-medium">Conciliado</p>
            <p className="text-sm text-muted-foreground">Marca cierre operativo del ajuste.</p>
          </div>
          <Switch
            checked={profile.conciliado}
            onCheckedChange={(value) => set("conciliado", value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Acciones</CardTitle>
            <CardDescription>Pasos operativos y documentales del ajuste heredado.</CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            className="bg-transparent"
            onClick={() => set("acciones", [...profile.acciones, createAdjustmentAction()])}
          >
            Agregar acción
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {profile.acciones.length > 0 ? (
            profile.acciones.map((action) => (
              <div
                key={action.id}
                className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1.4fr_1.2fr_140px_auto]"
              >
                <Input
                  value={action.descripcion}
                  onChange={(event) => updateAction(action.id, { descripcion: event.target.value })}
                  placeholder="Descripción"
                />
                <Input
                  value={action.destino}
                  onChange={(event) => updateAction(action.id, { destino: event.target.value })}
                  placeholder="Destino"
                />
                <Input
                  value={action.importe}
                  onChange={(event) => updateAction(action.id, { importe: event.target.value })}
                  placeholder="Importe"
                />
                <Button type="button" variant="ghost" onClick={() => removeAction(action.id)}>
                  Quitar
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Sin acciones documentadas.</p>
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

export default function VentasAjustesPage() {
  const { comprobantes } = useComprobantes({ esVenta: true })
  const { rows: legacyProfiles, setRows: setLegacyProfiles } =
    useLegacyLocalCollection<LegacyAdjustmentProfile>("ventas-ajustes-legacy", [])
  const [selected, setSelected] = useState<LegacySalesAdjustment | null>(null)
  const [editing, setEditing] = useState<LegacySalesAdjustment | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterEstado, setFilterEstado] = useState("todos")
  const [filterTipo, setFilterTipo] = useState("todos")
  const normalizedSearchTerm = searchTerm.toLowerCase().trim()
  const profileById = new Map(legacyProfiles.map((profile) => [profile.adjustmentId, profile]))

  const getProfile = (row: LegacySalesAdjustment) => {
    return profileById.get(row.id) ?? buildLegacyAdjustmentProfile(row)
  }

  const saveProfile = (profile: LegacyAdjustmentProfile) => {
    setLegacyProfiles((prev) => {
      const index = prev.findIndex((row) => row.adjustmentId === profile.adjustmentId)
      if (index === -1) return [...prev, profile]
      return prev.map((row) => (row.adjustmentId === profile.adjustmentId ? profile : row))
    })
    setEditing(null)
  }

  const filtered = legacySalesAdjustments.filter((row) => {
    const profile = getProfile(row)
    const matchesSearch =
      normalizedSearchTerm === "" ||
      row.id.toLowerCase().includes(normalizedSearchTerm) ||
      row.cliente.toLowerCase().includes(normalizedSearchTerm) ||
      row.motivo.toLowerCase().includes(normalizedSearchTerm) ||
      profile.puntoVenta.toLowerCase().includes(normalizedSearchTerm) ||
      profile.canal.toLowerCase().includes(normalizedSearchTerm) ||
      profile.documentoReferencia.toLowerCase().includes(normalizedSearchTerm)

    const matchesEstado = filterEstado === "todos" || row.estado === filterEstado
    const matchesTipo = filterTipo === "todos" || row.tipo === filterTipo

    return matchesSearch && matchesEstado && matchesTipo
  })

  const highlighted =
    filtered.find((row) => row.estado !== "APLICADO") ??
    filtered[0] ??
    legacySalesAdjustments[0] ??
    null

  const totals = {
    total: legacySalesAdjustments.length,
    debitos: legacySalesAdjustments.filter((row) => row.tipo === "Débito").length,
    creditos: legacySalesAdjustments.filter((row) => row.tipo === "Crédito").length,
    monto: legacySalesAdjustments.reduce((sum, row) => sum + row.total, 0),
  }
  const configured = legacySalesAdjustments.filter((row) => profileById.has(row.id)).length
  const approvals = legacyProfiles.filter((profile) => profile.requiereAprobacion).length
  const conciliados = legacyProfiles.filter((profile) => profile.conciliado).length
  const liveSalesDocs = comprobantes.filter((row) => row.estado !== "ANULADO").length
  const highlightedProfile = highlighted ? getProfile(highlighted) : null
  const highlightedFields =
    highlighted && highlightedProfile
      ? [
          { label: "Cliente", value: highlighted.cliente },
          { label: "Tipo", value: highlighted.tipo },
          { label: "Estado", value: highlighted.estado },
          { label: "Importe", value: formatMoney(highlighted.total) },
          { label: "Origen", value: highlightedProfile.origen },
          { label: "Resolución", value: highlightedProfile.resolucion },
          {
            label: "Documento referencia",
            value: highlightedProfile.documentoReferencia || "Sin referencia específica",
          },
          {
            label: "Autorización",
            value: highlightedProfile.requiereAprobacion
              ? highlightedProfile.autorizadoPor || "Pendiente"
              : "No requerida",
          },
        ]
      : []

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ajustes</h1>
          <p className="mt-1 text-muted-foreground">
            Ajustes comerciales y documentales del legacy expuestos con foco operativo mientras la
            API específica todavía no cubre este circuito de ventas.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/ventas/notas-credito">
            <Button variant="outline" className="bg-transparent">
              Notas crédito
            </Button>
          </Link>
          <Link href="/ventas/notas-debito">
            <Button>Notas débito</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ajustes visibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Débito</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{totals.debitos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Crédito</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-600">{totals.creditos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monto visible</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(totals.monto)}</div>
          </CardContent>
        </Card>
      </div>

      {highlighted ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardDescription>Ajuste destacado</CardDescription>
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
              <Scale className="h-4 w-4" /> Cobertura legacy
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {configured} ajustes ya tienen origen, autorización y resolución documentados en overlay
            local.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4" /> Aprobación y cierre
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {approvals} ajustes requieren aprobación y {conciliados} aparecen conciliados en el
            tramo heredado.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ReceiptText className="h-4 w-4" /> Contexto documental
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Hay {liveSalesDocs} comprobantes de venta visibles para resolver el ajuste sobre notas o
            documentación comercial existente.
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
                placeholder="Buscar por cliente, motivo, punto de venta o documento..."
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
                <SelectItem value="BORRADOR">Borrador</SelectItem>
                <SelectItem value="EMITIDO">Emitido</SelectItem>
                <SelectItem value="APLICADO">Aplicado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Débito">Débito</SelectItem>
                <SelectItem value="Crédito">Crédito</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-4 w-4" /> Ajustes visibles
          </CardTitle>
          <CardDescription>
            Overlay local para ajustes de débito y crédito comercial, incluyendo derivados de punto
            de venta.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Motivo</TableHead>
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
                  <TableCell>{row.tipo}</TableCell>
                  <TableCell>{getProfile(row).origen}</TableCell>
                  <TableCell>{row.motivo}</TableCell>
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
            <DialogTitle>Detalle de ajuste</DialogTitle>
            <DialogDescription>
              Visión operativa del ajuste comercial y su resolución documental.
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <Tabs defaultValue="principal" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="principal">Principal</TabsTrigger>
                <TabsTrigger value="circuito">Circuito</TabsTrigger>
                <TabsTrigger value="acciones">Acciones</TabsTrigger>
              </TabsList>
              <TabsContent value="principal" className="space-y-4 pt-4">
                <DetailFieldGrid
                  fields={[
                    { label: "Cliente", value: selected.cliente },
                    { label: "Fecha", value: selected.fecha },
                    { label: "Tipo", value: selected.tipo },
                    { label: "Total", value: formatMoney(selected.total) },
                    { label: "Motivo", value: selected.motivo },
                    { label: "Estado", value: selected.estado },
                  ]}
                />
              </TabsContent>
              <TabsContent value="circuito" className="space-y-4 pt-4">
                <DetailFieldGrid
                  fields={[
                    { label: "Origen", value: getProfile(selected).origen },
                    { label: "Resolución", value: getProfile(selected).resolucion },
                    {
                      label: "Punto de venta",
                      value: getProfile(selected).puntoVenta || "No informado",
                    },
                    { label: "Canal", value: getProfile(selected).canal || "No informado" },
                    {
                      label: "Autorización",
                      value: getProfile(selected).requiereAprobacion
                        ? getProfile(selected).autorizadoPor || "Pendiente"
                        : "No requerida",
                    },
                    { label: "Conciliado", value: getProfile(selected).conciliado ? "Sí" : "No" },
                  ]}
                />
              </TabsContent>
              <TabsContent value="acciones" className="space-y-4 pt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Percent className="h-4 w-4" /> Resolución recomendada
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-medium">{getProfile(selected).resolucion}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Tag className="h-4 w-4" /> Acciones operativas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {getProfile(selected).acciones.map((action) => (
                      <div key={action.id} className="rounded-lg border bg-muted/30 p-3">
                        <p className="font-medium">
                          {action.descripcion || "Acción sin descripción"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Destino: {action.destino || "No informado"} · Importe:{" "}
                          {action.importe || "0"}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <div className="flex flex-wrap gap-2">
                  <Link href="/ventas/notas-debito">
                    <Button
                      variant={selected.tipo === "Débito" ? "default" : "outline"}
                      className={selected.tipo === "Débito" ? "" : "bg-transparent"}
                    >
                      Abrir notas débito
                    </Button>
                  </Link>
                  <Link href="/ventas/notas-credito">
                    <Button
                      variant={selected.tipo === "Crédito" ? "default" : "outline"}
                      className={selected.tipo === "Crédito" ? "" : "bg-transparent"}
                    >
                      Abrir notas crédito
                    </Button>
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
              Origen, autorización, resolución y acciones del ajuste persistidas sólo en frontend
              hasta contar con backend específico.
            </DialogDescription>
          </DialogHeader>
          {editing ? (
            <LegacyAdjustmentDialog
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
