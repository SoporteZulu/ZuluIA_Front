"use client"

import { useMemo, useState } from "react"
import { AlertCircle, Plus, RefreshCw } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useCajas } from "@/lib/hooks/useCajas"
import { useCheques } from "@/lib/hooks/useCheques"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"
import { useTerceros } from "@/lib/hooks/useTerceros"
import type { CreateChequeDto } from "@/lib/types/cheques"

function formatMoney(value: number) {
  return value.toLocaleString("es-AR", { style: "currency", currency: "ARS" })
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "-"
}

function buildOffsetIsoDate(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

const EMPTY_FORM = {
  cajaId: "",
  terceroId: "none",
  nroCheque: "",
  banco: "",
  importe: "",
  fechaEmision: new Date().toISOString().slice(0, 10),
  fechaVencimiento: "",
}

export default function VentasChequesPage() {
  const sucursalId = useDefaultSucursalId()
  const { cheques, loading, error, crear, depositar, acreditar, rechazar, entregar, refetch } =
    useCheques()
  const { cajas } = useCajas(sucursalId)
  const { terceros } = useTerceros({ soloActivos: false })
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const thirdPartyMap = useMemo(() => new Map(terceros.map((row) => [row.id, row])), [terceros])
  const totals = useMemo(
    () => ({
      count: cheques.length,
      amount: cheques.reduce((sum, row) => sum + Number(row.importe ?? 0), 0),
      pending: cheques.filter((row) => row.estado === "EMITIDO" || row.estado === "DEPOSITADO")
        .length,
      rejected: cheques.filter((row) => row.estado === "RECHAZADO").length,
    }),
    [cheques]
  )

  const highlighted = cheques[0] ?? null

  const handleCreate = async () => {
    if (!form.cajaId || !form.nroCheque.trim() || !form.importe || !form.fechaEmision) {
      setFormError("Caja, número, importe y fecha de emisión son obligatorios")
      return
    }

    const dto: CreateChequeDto = {
      cajaId: Number(form.cajaId),
      terceroId: form.terceroId === "none" ? undefined : Number(form.terceroId),
      nroCheque: form.nroCheque.trim(),
      banco: form.banco.trim() || undefined,
      importe: Number(form.importe),
      monedaId: 1,
      fechaEmision: form.fechaEmision,
      fechaVencimiento: form.fechaVencimiento || undefined,
    }

    setSaving(true)
    setFormError(null)
    const ok = await crear(dto)
    setSaving(false)
    if (!ok) {
      setFormError("No se pudo registrar el cheque")
      return
    }

    setForm(EMPTY_FORM)
    setIsFormOpen(false)
  }

  const handleDeposit = async (id: number) => {
    if (!window.confirm(`¿Depositar cheque #${id}?`)) return
    const today = new Date().toISOString().slice(0, 10)
    const accreditation = buildOffsetIsoDate(2)
    await depositar(id, today, accreditation)
  }

  const handleAccredit = async (id: number) => {
    if (!window.confirm(`¿Acreditar cheque #${id}?`)) return
    const today = new Date().toISOString().slice(0, 10)
    await acreditar(id, today)
  }

  const handleReject = async (id: number) => {
    if (!window.confirm(`¿Rechazar cheque #${id}?`)) return
    await rechazar(id, "Rechazo operativo registrado desde ventas")
  }

  const handleDeliver = async (id: number) => {
    if (!window.confirm(`¿Entregar cheque #${id}?`)) return
    await entregar(id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cheques</h1>
          <p className="mt-1 text-muted-foreground">
            Cartera operativa con alta real y acciones básicas sobre depósito, acreditación, rechazo
            y entrega.
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo cheque
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cheques visibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Importe visible</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(totals.amount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rechazados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totals.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {highlighted ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardDescription>Cheque destacado</CardDescription>
            <CardTitle className="mt-1 text-xl">{highlighted.nroCheque}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Banco</p>
              <p className="text-sm font-medium">{highlighted.banco ?? "No informado"}</p>
            </div>
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Tercero</p>
              <p className="text-sm font-medium">
                {highlighted.terceroId
                  ? (thirdPartyMap.get(highlighted.terceroId)?.razonSocial ??
                    `#${highlighted.terceroId}`)
                  : "Sin tercero"}
              </p>
            </div>
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Estado</p>
              <p className="text-sm font-medium">{highlighted.estado}</p>
            </div>
            <div className="rounded-lg bg-background/70 p-3">
              <p className="text-xs text-muted-foreground">Vencimiento</p>
              <p className="text-sm font-medium">{formatDate(highlighted.fechaVencimiento)}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Cartera visible</CardTitle>
            <CardDescription>
              Operaciones habilitadas según el estado reportado por el backend.
            </CardDescription>
          </div>
          <Button variant="outline" className="bg-transparent" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Recargar
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Tercero</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead className="text-right">Importe</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loading && cheques.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No hay cheques visibles en la cartera actual.
                  </TableCell>
                </TableRow>
              ) : null}
              {cheques.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.nroCheque}</TableCell>
                  <TableCell>
                    {row.terceroId
                      ? (thirdPartyMap.get(row.terceroId)?.razonSocial ?? `#${row.terceroId}`)
                      : "Sin tercero"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{row.estado}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(row.fechaVencimiento)}</TableCell>
                  <TableCell className="text-right">{formatMoney(row.importe)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {row.estado === "EMITIDO" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-transparent"
                          onClick={() => handleDeposit(row.id)}
                        >
                          Depositar
                        </Button>
                      ) : null}
                      {row.estado === "DEPOSITADO" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-transparent"
                          onClick={() => handleAccredit(row.id)}
                        >
                          Acreditar
                        </Button>
                      ) : null}
                      {row.estado !== "RECHAZADO" && row.estado !== "ENTREGADO" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-transparent"
                          onClick={() => handleReject(row.id)}
                        >
                          Rechazar
                        </Button>
                      ) : null}
                      {row.estado === "EMITIDO" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-transparent"
                          onClick={() => handleDeliver(row.id)}
                        >
                          Entregar
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nuevo cheque</DialogTitle>
            <DialogDescription>
              Registro real usando el contrato actual de cartera de cheques.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Caja</Label>
              <Select
                value={form.cajaId}
                onValueChange={(value) => setForm((prev) => ({ ...prev, cajaId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar caja" />
                </SelectTrigger>
                <SelectContent>
                  {cajas.map((row) => (
                    <SelectItem key={row.id} value={String(row.id)}>
                      {row.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tercero</Label>
              <Select
                value={form.terceroId}
                onValueChange={(value) => setForm((prev) => ({ ...prev, terceroId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tercero" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin tercero</SelectItem>
                  {terceros.map((row) => (
                    <SelectItem key={row.id} value={String(row.id)}>
                      {row.razonSocial}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Número</Label>
              <Input
                value={form.nroCheque}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, nroCheque: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Banco</Label>
              <Input
                value={form.banco}
                onChange={(event) => setForm((prev) => ({ ...prev, banco: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Importe</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.importe}
                onChange={(event) => setForm((prev) => ({ ...prev, importe: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha emisión</Label>
              <Input
                type="date"
                value={form.fechaEmision}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, fechaEmision: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Fecha vencimiento</Label>
              <Input
                type="date"
                value={form.fechaVencimiento}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, fechaVencimiento: event.target.value }))
                }
              />
            </div>
          </div>
          {formError ? <p className="text-sm text-red-500">{formError}</p> : null}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={() => setIsFormOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Guardando..." : "Registrar cheque"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
