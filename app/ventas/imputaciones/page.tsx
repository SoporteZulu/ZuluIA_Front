"use client"

import Link from "next/link"
import { useState } from "react"
import {
  Eye,
  Landmark,
  ReceiptText,
  Wallet,
  Search,
  Filter,
  Edit,
  Layers3,
  GitCompareArrows,
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
import { useCobros } from "@/lib/hooks/useCobros"
import { useComprobantes } from "@/lib/hooks/useComprobantes"
import { useLegacyLocalCollection } from "@/lib/hooks/useLegacyLocalCollection"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"
import { legacySalesAllocations, type LegacySalesAllocation } from "@/lib/ventas-legacy-data"
import {
  buildLegacyAllocationProfile,
  type LegacyAllocationLine,
  type LegacyAllocationProfile,
} from "@/lib/ventas-imputaciones-legacy"

function formatMoney(value: number) {
  return value.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  })
}

function statusBadge(status: LegacySalesAllocation["estado"]) {
  if (status === "PENDIENTE") return <Badge variant="secondary">Pendiente</Badge>
  if (status === "IMPUTADA") return <Badge>Imputada</Badge>
  return <Badge variant="outline">Observada</Badge>
}

function createAllocationLine(): LegacyAllocationLine {
  return {
    id: `allocation-line-${globalThis.crypto.randomUUID()}`,
    referencia: "",
    tipo: "",
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

function LegacyAllocationDialog({
  initialProfile,
  onClose,
  onSave,
}: {
  initialProfile: LegacyAllocationProfile
  onClose: () => void
  onSave: (profile: LegacyAllocationProfile) => void
}) {
  const [profile, setProfile] = useState<LegacyAllocationProfile>(initialProfile)

  const set = (
    key: keyof LegacyAllocationProfile,
    value: string | boolean | LegacyAllocationLine[]
  ) => {
    setProfile((prev) => ({ ...prev, [key]: value }))
  }

  const updateLine = (id: string, patch: Partial<LegacyAllocationLine>) => {
    setProfile((prev) => ({
      ...prev,
      lineas: prev.lineas.map((linea) => (linea.id === id ? { ...linea, ...patch } : linea)),
    }))
  }

  const removeLine = (id: string) => {
    setProfile((prev) => ({
      ...prev,
      lineas: prev.lineas.filter((linea) => linea.id !== id),
    }))
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Modalidad</Label>
          <Select value={profile.modalidad} onValueChange={(value) => set("modalidad", value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Manual">Manual</SelectItem>
              <SelectItem value="Masiva">Masiva</SelectItem>
              <SelectItem value="Desimputación">Desimputación</SelectItem>
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
          <Label>Origen</Label>
          <Input value={profile.origen} onChange={(event) => set("origen", event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Cuenta puente</Label>
          <Input
            value={profile.cuentaPuente}
            onChange={(event) => set("cuentaPuente", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Operador</Label>
          <Input
            value={profile.operador}
            onChange={(event) => set("operador", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Lote</Label>
          <Input value={profile.lote} onChange={(event) => set("lote", event.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="font-medium">Conciliado</p>
            <p className="text-sm text-muted-foreground">
              Marca conciliación del lote o aplicación.
            </p>
          </div>
          <Switch
            checked={profile.conciliado}
            onCheckedChange={(value) => set("conciliado", value)}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="font-medium">Permite desimputar</p>
            <p className="text-sm text-muted-foreground">
              Refleja el circuito de reversa del legado.
            </p>
          </div>
          <Switch
            checked={profile.permiteDesimputar}
            onCheckedChange={(value) => set("permiteDesimputar", value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Líneas de imputación</CardTitle>
            <CardDescription>
              Aplicaciones parciales, masivas o reversas documentadas localmente.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            className="bg-transparent"
            onClick={() => set("lineas", [...profile.lineas, createAllocationLine()])}
          >
            Agregar línea
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {profile.lineas.length > 0 ? (
            profile.lineas.map((linea) => (
              <div
                key={linea.id}
                className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1.3fr_1fr_140px_auto]"
              >
                <Input
                  value={linea.referencia}
                  onChange={(event) => updateLine(linea.id, { referencia: event.target.value })}
                  placeholder="Referencia"
                />
                <Input
                  value={linea.tipo}
                  onChange={(event) => updateLine(linea.id, { tipo: event.target.value })}
                  placeholder="Tipo"
                />
                <Input
                  value={linea.importe}
                  onChange={(event) => updateLine(linea.id, { importe: event.target.value })}
                  placeholder="Importe"
                />
                <Button type="button" variant="ghost" onClick={() => removeLine(linea.id)}>
                  Quitar
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Sin líneas documentadas.</p>
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

export default function VentasImputacionesPage() {
  const sucursalId = useDefaultSucursalId()
  const { cobros } = useCobros({ sucursalId })
  const { comprobantes } = useComprobantes({ esVenta: true })
  const { rows: legacyProfiles, setRows: setLegacyProfiles } =
    useLegacyLocalCollection<LegacyAllocationProfile>("ventas-imputaciones-legacy", [])
  const [selected, setSelected] = useState<LegacySalesAllocation | null>(null)
  const [editing, setEditing] = useState<LegacySalesAllocation | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterEstado, setFilterEstado] = useState("todos")
  const [filterModalidad, setFilterModalidad] = useState("todos")

  const normalizedSearchTerm = searchTerm.toLowerCase().trim()
  const profileById = new Map(legacyProfiles.map((profile) => [profile.allocationId, profile]))

  const getProfile = (row: LegacySalesAllocation) => {
    return profileById.get(row.id) ?? buildLegacyAllocationProfile(row)
  }

  const saveProfile = (profile: LegacyAllocationProfile) => {
    setLegacyProfiles((prev) => {
      const index = prev.findIndex((row) => row.allocationId === profile.allocationId)
      if (index === -1) return [...prev, profile]
      return prev.map((row) => (row.allocationId === profile.allocationId ? profile : row))
    })
    setEditing(null)
  }

  const filtered = legacySalesAllocations.filter((row) => {
    const profile = getProfile(row)
    const matchesSearch =
      normalizedSearchTerm === "" ||
      row.cliente.toLowerCase().includes(normalizedSearchTerm) ||
      row.comprobante.toLowerCase().includes(normalizedSearchTerm) ||
      row.cuenta.toLowerCase().includes(normalizedSearchTerm) ||
      row.centroCosto.toLowerCase().includes(normalizedSearchTerm) ||
      profile.origen.toLowerCase().includes(normalizedSearchTerm) ||
      profile.operador.toLowerCase().includes(normalizedSearchTerm)

    const matchesEstado = filterEstado === "todos" || row.estado === filterEstado
    const matchesModalidad = filterModalidad === "todos" || profile.modalidad === filterModalidad

    return matchesSearch && matchesEstado && matchesModalidad
  })

  const highlighted =
    filtered.find((row) => row.estado === "PENDIENTE") ??
    filtered[0] ??
    legacySalesAllocations[0] ??
    null

  const totals = {
    total: legacySalesAllocations.length,
    pendientes: legacySalesAllocations.filter((row) => row.estado === "PENDIENTE").length,
    imputadas: legacySalesAllocations.filter((row) => row.estado === "IMPUTADA").length,
    monto: legacySalesAllocations.reduce((sum, row) => sum + row.importe, 0),
  }

  const pendingLiveDocs = comprobantes.filter(
    (row) => row.saldo > 0 && row.estado !== "ANULADO"
  ).length
  const livePendingTotal = comprobantes
    .filter((row) => row.saldo > 0 && row.estado !== "ANULADO")
    .reduce((sum, row) => sum + row.saldo, 0)
  const configured = legacySalesAllocations.filter((row) => profileById.has(row.id)).length
  const masivas = legacyProfiles.filter((profile) => profile.modalidad === "Masiva").length
  const reversables = legacyProfiles.filter((profile) => profile.permiteDesimputar).length
  const highlightedProfile = highlighted ? getProfile(highlighted) : null
  const highlightedFields =
    highlighted && highlightedProfile
      ? [
          { label: "Cliente", value: highlighted.cliente },
          { label: "Comprobante", value: highlighted.comprobante },
          { label: "Cuenta", value: highlighted.cuenta },
          { label: "Centro de costo", value: highlighted.centroCosto },
          { label: "Modalidad", value: highlightedProfile.modalidad },
          { label: "Origen", value: highlightedProfile.origen || "No informado" },
          { label: "Conciliado", value: highlightedProfile.conciliado ? "Sí" : "No" },
          {
            label: "Desimputación",
            value: highlightedProfile.permiteDesimputar ? "Permitida" : "No prevista",
          },
        ]
      : []

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Imputaciones</h1>
          <p className="mt-1 text-muted-foreground">
            Imputaciones comerciales y contables visibles para completar el circuito de aplicación
            de ventas hasta que exista un servicio dedicado de imputación y desimputación.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/ventas/cobros">
            <Button variant="outline" className="bg-transparent">
              Cobros
            </Button>
          </Link>
          <Link href="/ventas/cuenta-corriente">
            <Button>Cuenta corriente</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Imputaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{totals.pendientes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Comprobantes con saldo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{pendingLiveDocs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Importe visible</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(totals.monto)}</div>
          </CardContent>
        </Card>
      </div>

      {highlighted ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardDescription>Aplicación prioritaria</CardDescription>
            <CardTitle className="mt-1 text-xl">{highlighted.comprobante}</CardTitle>
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
              <Layers3 className="h-4 w-4" /> Cobertura legacy
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {configured} imputaciones ya tienen circuito heredado documentado, con {masivas} lotes
            masivos visibles.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <GitCompareArrows className="h-4 w-4" /> Reversa y conciliación
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {reversables} tramos permiten desimputación y la lectura operativa ya distingue
            aplicación manual, masiva o reversa.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ReceiptText className="h-4 w-4" /> Saldo vivo
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {pendingLiveDocs} comprobantes de venta siguen con saldo, por{" "}
            {formatMoney(livePendingTotal)} visibles desde backend.
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
                placeholder="Buscar por cliente, comprobante, cuenta u operador..."
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
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="IMPUTADA">Imputada</SelectItem>
                <SelectItem value="OBSERVADA">Observada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterModalidad} onValueChange={setFilterModalidad}>
              <SelectTrigger>
                <SelectValue placeholder="Modalidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="Manual">Manual</SelectItem>
                <SelectItem value="Masiva">Masiva</SelectItem>
                <SelectItem value="Desimputación">Desimputación</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="h-4 w-4" /> Imputaciones visibles
            </CardTitle>
            <CardDescription>
              Overlay local del tramo de imputación documental y contable.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Comprobante</TableHead>
                  <TableHead>Modalidad</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead className="text-right">Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.cliente}</TableCell>
                    <TableCell>{row.comprobante}</TableCell>
                    <TableCell>{getProfile(row).modalidad}</TableCell>
                    <TableCell>{row.cuenta}</TableCell>
                    <TableCell>{statusBadge(row.estado)}</TableCell>
                    <TableCell className="text-right">{formatMoney(row.importe)}</TableCell>
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contexto vivo</CardTitle>
            <CardDescription>
              Señales reales del backend relacionadas con la aplicación de cobros.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Wallet className="h-4 w-4" /> Cobros visibles
              </div>
              <p className="mt-2 text-2xl font-bold">{cobros.length}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ReceiptText className="h-4 w-4" /> Documentos con saldo
              </div>
              <p className="mt-2 text-2xl font-bold">{pendingLiveDocs}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Landmark className="h-4 w-4" /> Saldo pendiente visible
              </div>
              <p className="mt-2 text-2xl font-bold">{formatMoney(livePendingTotal)}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              La imputación masiva y la desimputación todavía dependen de un servicio dedicado; por
              eso este tramo sigue en overlay local aunque ya convive con cobros y comprobantes
              reales.
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalle de imputación</DialogTitle>
            <DialogDescription>
              Visibilidad del tramo comercial-contable hasta contar con servicio específico.
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <Tabs defaultValue="principal" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="principal">Principal</TabsTrigger>
                <TabsTrigger value="circuito">Circuito</TabsTrigger>
                <TabsTrigger value="lineas">Líneas</TabsTrigger>
              </TabsList>
              <TabsContent value="principal" className="space-y-4 pt-4">
                <DetailFieldGrid
                  fields={[
                    { label: "Cliente", value: selected.cliente },
                    { label: "Fecha", value: selected.fecha },
                    { label: "Estado", value: selected.estado },
                    { label: "Importe", value: formatMoney(selected.importe) },
                    { label: "Cuenta", value: selected.cuenta },
                    { label: "Centro de costo", value: selected.centroCosto },
                  ]}
                />
              </TabsContent>
              <TabsContent value="circuito" className="space-y-4 pt-4">
                <DetailFieldGrid
                  fields={[
                    { label: "Modalidad", value: getProfile(selected).modalidad },
                    { label: "Origen", value: getProfile(selected).origen || "No informado" },
                    { label: "Prioridad", value: getProfile(selected).prioridad },
                    { label: "Conciliado", value: getProfile(selected).conciliado ? "Sí" : "No" },
                    {
                      label: "Permite desimputar",
                      value: getProfile(selected).permiteDesimputar ? "Sí" : "No",
                    },
                    { label: "Operador", value: getProfile(selected).operador || "Pendiente" },
                  ]}
                />
              </TabsContent>
              <TabsContent value="lineas" className="space-y-4 pt-4">
                <div className="space-y-2">
                  {getProfile(selected).lineas.map((linea) => (
                    <div key={linea.id} className="rounded-lg border bg-muted/30 p-3">
                      <p className="font-medium">{linea.referencia || "Línea sin referencia"}</p>
                      <p className="text-sm text-muted-foreground">
                        Tipo: {linea.tipo || "No informado"} · Importe: {linea.importe || "0"}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href="/ventas/cobros">
                    <Button variant="outline" className="bg-transparent">
                      Ir a cobros
                    </Button>
                  </Link>
                  <Link href="/ventas/cuenta-corriente">
                    <Button>Revisar cuenta corriente</Button>
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
              Modalidad manual, masiva o desimputación persistidas sólo en frontend hasta contar con
              backend específico.
            </DialogDescription>
          </DialogHeader>
          {editing ? (
            <LegacyAllocationDialog
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
