"use client"

import { useMemo, useState } from "react"
import { PencilLine, Plus, Search } from "lucide-react"

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useLegacyLocalCollection } from "@/lib/hooks/useLegacyLocalCollection"
import {
  legacySchoolBillings,
  legacySchoolCedulones,
  legacySchoolReceipts,
  type LegacySchoolBilling,
  type LegacySchoolCedulon,
  type LegacySchoolReceipt,
} from "@/lib/legacy-masters-data"

type BillingFormState = {
  id?: string
  alumno: string
  familia: string
  sede: string
  nivel: string
  comprobante: string
  fechaEmision: string
  fechaVencimiento: string
  total: string
  saldo: string
  automatica: "si" | "no"
  estado: LegacySchoolBilling["estado"]
  observacion: string
}

type CedulonFormState = {
  id?: string
  alumno: string
  familia: string
  plan: string
  lote: string
  fechaVencimiento: string
  importe: string
  saldo: string
  gestion: string
  estado: LegacySchoolCedulon["estado"]
}

type ReceiptFormState = {
  id?: string
  numero: string
  alumno: string
  caja: string
  medio: string
  fecha: string
  total: string
  aplicadoA: string
  estado: LegacySchoolReceipt["estado"]
}

const initialBillingForm: BillingFormState = {
  alumno: "",
  familia: "",
  sede: "",
  nivel: "",
  comprobante: "",
  fechaEmision: "",
  fechaVencimiento: "",
  total: "0",
  saldo: "0",
  automatica: "no",
  estado: "emitida",
  observacion: "",
}

const initialCedulonForm: CedulonFormState = {
  alumno: "",
  familia: "",
  plan: "",
  lote: "",
  fechaVencimiento: "",
  importe: "0",
  saldo: "0",
  gestion: "",
  estado: "emitido",
}

const initialReceiptForm: ReceiptFormState = {
  numero: "",
  alumno: "",
  caja: "",
  medio: "",
  fecha: "",
  total: "0",
  aplicadoA: "",
  estado: "registrado",
}

function billingBadge(value: LegacySchoolBilling["estado"]) {
  if (value === "vencida") return <Badge variant="destructive">Vencida</Badge>
  if (value === "parcial") return <Badge variant="secondary">Parcial</Badge>
  if (value === "cerrada") return <Badge variant="outline">Cerrada</Badge>
  return <Badge>Emitida</Badge>
}

function cedulonBadge(value: LegacySchoolCedulon["estado"]) {
  if (value === "vencido") return <Badge variant="destructive">Vencido</Badge>
  if (value === "gestion") return <Badge variant="secondary">Gestion</Badge>
  if (value === "cancelado") return <Badge variant="outline">Cancelado</Badge>
  return <Badge>Emitido</Badge>
}

function receiptBadge(value: LegacySchoolReceipt["estado"]) {
  if (value === "revertido") return <Badge variant="destructive">Revertido</Badge>
  if (value === "pendiente") return <Badge variant="secondary">Pendiente</Badge>
  return <Badge>Registrado</Badge>
}

export default function ColegioCarteraPage() {
  const { rows: billings, setRows: setBillings } = useLegacyLocalCollection<LegacySchoolBilling>(
    "legacy-school-billings",
    legacySchoolBillings
  )
  const { rows: cedulones, setRows: setCedulones } = useLegacyLocalCollection<LegacySchoolCedulon>(
    "legacy-school-cedulones",
    legacySchoolCedulones
  )
  const { rows: receipts, setRows: setReceipts } = useLegacyLocalCollection<LegacySchoolReceipt>(
    "legacy-school-receipts",
    legacySchoolReceipts
  )
  const [tab, setTab] = useState<"facturacion" | "cedulones" | "recibos">("facturacion")
  const [search, setSearch] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [billingForm, setBillingForm] = useState<BillingFormState>(initialBillingForm)
  const [cedulonForm, setCedulonForm] = useState<CedulonFormState>(initialCedulonForm)
  const [receiptForm, setReceiptForm] = useState<ReceiptFormState>(initialReceiptForm)

  const filteredBillings = useMemo(() => {
    const term = search.trim().toLowerCase()
    return billings.filter(
      (row) =>
        !term ||
        row.alumno.toLowerCase().includes(term) ||
        row.familia.toLowerCase().includes(term) ||
        row.comprobante.toLowerCase().includes(term) ||
        row.sede.toLowerCase().includes(term)
    )
  }, [billings, search])

  const filteredCedulones = useMemo(() => {
    const term = search.trim().toLowerCase()
    return cedulones.filter(
      (row) =>
        !term ||
        row.alumno.toLowerCase().includes(term) ||
        row.familia.toLowerCase().includes(term) ||
        row.plan.toLowerCase().includes(term) ||
        row.lote.toLowerCase().includes(term)
    )
  }, [cedulones, search])

  const filteredReceipts = useMemo(() => {
    const term = search.trim().toLowerCase()
    return receipts.filter(
      (row) =>
        !term ||
        row.numero.toLowerCase().includes(term) ||
        row.alumno.toLowerCase().includes(term) ||
        row.caja.toLowerCase().includes(term) ||
        row.aplicadoA.toLowerCase().includes(term)
    )
  }, [receipts, search])

  const highlightedBilling = filteredBillings[0] ?? billings[0] ?? null
  const highlightedCedulon = filteredCedulones[0] ?? cedulones[0] ?? null
  const highlightedReceipt = filteredReceipts[0] ?? receipts[0] ?? null

  const openBillingDialog = (row?: LegacySchoolBilling) => {
    setBillingForm(
      row
        ? {
            id: row.id,
            alumno: row.alumno,
            familia: row.familia,
            sede: row.sede,
            nivel: row.nivel,
            comprobante: row.comprobante,
            fechaEmision: row.fechaEmision,
            fechaVencimiento: row.fechaVencimiento,
            total: String(row.total),
            saldo: String(row.saldo),
            automatica: row.automatica ? "si" : "no",
            estado: row.estado,
            observacion: row.observacion,
          }
        : initialBillingForm
    )
    setTab("facturacion")
    setIsDialogOpen(true)
  }

  const openCedulonDialog = (row?: LegacySchoolCedulon) => {
    setCedulonForm(
      row
        ? {
            id: row.id,
            alumno: row.alumno,
            familia: row.familia,
            plan: row.plan,
            lote: row.lote,
            fechaVencimiento: row.fechaVencimiento,
            importe: String(row.importe),
            saldo: String(row.saldo),
            gestion: row.gestion,
            estado: row.estado,
          }
        : initialCedulonForm
    )
    setTab("cedulones")
    setIsDialogOpen(true)
  }

  const openReceiptDialog = (row?: LegacySchoolReceipt) => {
    setReceiptForm(
      row
        ? {
            id: row.id,
            numero: row.numero,
            alumno: row.alumno,
            caja: row.caja,
            medio: row.medio,
            fecha: row.fecha,
            total: String(row.total),
            aplicadoA: row.aplicadoA,
            estado: row.estado,
          }
        : initialReceiptForm
    )
    setTab("recibos")
    setIsDialogOpen(true)
  }

  function saveCurrentTab() {
    if (tab === "facturacion") {
      const nextRow: LegacySchoolBilling = {
        id: billingForm.id ?? globalThis.crypto.randomUUID(),
        alumno: billingForm.alumno,
        familia: billingForm.familia,
        sede: billingForm.sede,
        nivel: billingForm.nivel,
        comprobante: billingForm.comprobante,
        fechaEmision: billingForm.fechaEmision,
        fechaVencimiento: billingForm.fechaVencimiento,
        total: Number(billingForm.total),
        saldo: Number(billingForm.saldo),
        automatica: billingForm.automatica === "si",
        estado: billingForm.estado,
        observacion: billingForm.observacion,
      }

      setBillings((current) =>
        billingForm.id
          ? current.map((row) => (row.id === billingForm.id ? nextRow : row))
          : [nextRow, ...current]
      )
    }

    if (tab === "cedulones") {
      const nextRow: LegacySchoolCedulon = {
        id: cedulonForm.id ?? globalThis.crypto.randomUUID(),
        alumno: cedulonForm.alumno,
        familia: cedulonForm.familia,
        plan: cedulonForm.plan,
        lote: cedulonForm.lote,
        fechaVencimiento: cedulonForm.fechaVencimiento,
        importe: Number(cedulonForm.importe),
        saldo: Number(cedulonForm.saldo),
        gestion: cedulonForm.gestion,
        estado: cedulonForm.estado,
      }

      setCedulones((current) =>
        cedulonForm.id
          ? current.map((row) => (row.id === cedulonForm.id ? nextRow : row))
          : [nextRow, ...current]
      )
    }

    if (tab === "recibos") {
      const nextRow: LegacySchoolReceipt = {
        id: receiptForm.id ?? globalThis.crypto.randomUUID(),
        numero: receiptForm.numero,
        alumno: receiptForm.alumno,
        caja: receiptForm.caja,
        medio: receiptForm.medio,
        fecha: receiptForm.fecha,
        total: Number(receiptForm.total),
        aplicadoA: receiptForm.aplicadoA,
        estado: receiptForm.estado,
      }

      setReceipts((current) =>
        receiptForm.id
          ? current.map((row) => (row.id === receiptForm.id ? nextRow : row))
          : [nextRow, ...current]
      )
    }

    setIsDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Colegio: Cartera</h1>
        <p className="mt-1 text-muted-foreground">
          Circuito agrupado para `frmColegioFacturacion`, `frmColegioFacturacionAutomatica`,
          `frmColegioEmisionCedulones`, `frmColegioCancelacionDeuda`, `frmColegioCobinpro` y
          `frmColegioRecibos`.
        </p>
      </div>

      <Alert>
        <AlertTitle>Sin backend inventado</AlertTitle>
        <AlertDescription>
          Toda la operacion visible de colegio sigue en dataset local persistido. La pantalla cubre
          navegacion, consulta y mantenimiento funcional sin prometer APIs que hoy no existen.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Facturas abiertas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {billings.filter((row) => row.saldo > 0).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cedulones en gestion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cedulones.filter((row) => row.estado === "gestion").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recibos pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {receipts.filter((row) => row.estado === "pendiente").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Importe visible</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${billings.reduce((sum, row) => sum + row.saldo, 0).toLocaleString("es-AR")}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle>Operacion agrupada</CardTitle>
              <CardDescription>
                La misma pantalla resuelve cartera, deuda y recibos para evitar dispersion del
                modulo.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative min-w-70">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar alumno, familia, lote o comprobante..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Button
                onClick={() => {
                  if (tab === "facturacion") openBillingDialog()
                  if (tab === "cedulones") openCedulonDialog()
                  if (tab === "recibos") openReceiptDialog()
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> Nuevo registro
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
            <TabsList>
              <TabsTrigger value="facturacion">Facturacion</TabsTrigger>
              <TabsTrigger value="cedulones">Cedulones y deuda</TabsTrigger>
              <TabsTrigger value="recibos">Recibos</TabsTrigger>
            </TabsList>

            <TabsContent value="facturacion" className="mt-4 grid gap-6 xl:grid-cols-[1.7fr_1fr]">
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Alumno</TableHead>
                        <TableHead>Comprobante</TableHead>
                        <TableHead>Emision</TableHead>
                        <TableHead>Saldo</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBillings.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{row.alumno}</TableCell>
                          <TableCell>{row.comprobante}</TableCell>
                          <TableCell>{row.fechaEmision}</TableCell>
                          <TableCell>${row.saldo.toLocaleString("es-AR")}</TableCell>
                          <TableCell>{billingBadge(row.estado)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openBillingDialog(row)}
                            >
                              <PencilLine className="mr-2 h-4 w-4" /> Editar
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
                  <CardTitle>Detalle de facturacion</CardTitle>
                </CardHeader>
                <CardContent>
                  {highlightedBilling ? (
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{highlightedBilling.alumno}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {highlightedBilling.familia}
                          </p>
                        </div>
                        {billingBadge(highlightedBilling.estado)}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border p-3">
                          <p className="text-sm text-muted-foreground">Sede</p>
                          <p className="mt-2 font-medium">{highlightedBilling.sede}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-sm text-muted-foreground">Nivel</p>
                          <p className="mt-2 font-medium">{highlightedBilling.nivel}</p>
                        </div>
                      </div>
                      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                        {highlightedBilling.observacion}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No hay registros visibles.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cedulones" className="mt-4 grid gap-6 xl:grid-cols-[1.7fr_1fr]">
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Alumno</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Lote</TableHead>
                        <TableHead>Saldo</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCedulones.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{row.alumno}</TableCell>
                          <TableCell>{row.plan}</TableCell>
                          <TableCell>{row.lote}</TableCell>
                          <TableCell>${row.saldo.toLocaleString("es-AR")}</TableCell>
                          <TableCell>{cedulonBadge(row.estado)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openCedulonDialog(row)}
                            >
                              <PencilLine className="mr-2 h-4 w-4" /> Editar
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
                  <CardTitle>Detalle de deuda</CardTitle>
                </CardHeader>
                <CardContent>
                  {highlightedCedulon ? (
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{highlightedCedulon.alumno}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {highlightedCedulon.familia}
                          </p>
                        </div>
                        {cedulonBadge(highlightedCedulon.estado)}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border p-3">
                          <p className="text-sm text-muted-foreground">Plan</p>
                          <p className="mt-2 font-medium">{highlightedCedulon.plan}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-sm text-muted-foreground">Gestion</p>
                          <p className="mt-2 font-medium">{highlightedCedulon.gestion}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No hay registros visibles.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recibos" className="mt-4 grid gap-6 xl:grid-cols-[1.7fr_1fr]">
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Numero</TableHead>
                        <TableHead>Alumno</TableHead>
                        <TableHead>Caja</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReceipts.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{row.numero}</TableCell>
                          <TableCell>{row.alumno}</TableCell>
                          <TableCell>{row.caja}</TableCell>
                          <TableCell>${row.total.toLocaleString("es-AR")}</TableCell>
                          <TableCell>{receiptBadge(row.estado)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openReceiptDialog(row)}
                            >
                              <PencilLine className="mr-2 h-4 w-4" /> Editar
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
                  <CardTitle>Detalle de recibo</CardTitle>
                </CardHeader>
                <CardContent>
                  {highlightedReceipt ? (
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{highlightedReceipt.numero}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {highlightedReceipt.alumno}
                          </p>
                        </div>
                        {receiptBadge(highlightedReceipt.estado)}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border p-3">
                          <p className="text-sm text-muted-foreground">Medio</p>
                          <p className="mt-2 font-medium">{highlightedReceipt.medio}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-sm text-muted-foreground">Aplicado a</p>
                          <p className="mt-2 font-medium">{highlightedReceipt.aplicadoA}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No hay registros visibles.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edicion de cartera</DialogTitle>
            <DialogDescription>
              El formulario cambia segun el circuito activo para cubrir los formularios del legacy.
            </DialogDescription>
          </DialogHeader>
          {tab === "facturacion" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                label="Alumno"
                value={billingForm.alumno}
                onChange={(value) => setBillingForm((current) => ({ ...current, alumno: value }))}
              />
              <InputField
                label="Familia"
                value={billingForm.familia}
                onChange={(value) => setBillingForm((current) => ({ ...current, familia: value }))}
              />
              <InputField
                label="Sede"
                value={billingForm.sede}
                onChange={(value) => setBillingForm((current) => ({ ...current, sede: value }))}
              />
              <InputField
                label="Nivel"
                value={billingForm.nivel}
                onChange={(value) => setBillingForm((current) => ({ ...current, nivel: value }))}
              />
              <InputField
                label="Comprobante"
                value={billingForm.comprobante}
                onChange={(value) =>
                  setBillingForm((current) => ({ ...current, comprobante: value }))
                }
              />
              <InputField
                label="Estado"
                value={billingForm.estado}
                onChange={(value) =>
                  setBillingForm((current) => ({
                    ...current,
                    estado: value as LegacySchoolBilling["estado"],
                  }))
                }
              />
              <InputField
                label="Fecha emision"
                value={billingForm.fechaEmision}
                onChange={(value) =>
                  setBillingForm((current) => ({ ...current, fechaEmision: value }))
                }
              />
              <InputField
                label="Fecha vencimiento"
                value={billingForm.fechaVencimiento}
                onChange={(value) =>
                  setBillingForm((current) => ({ ...current, fechaVencimiento: value }))
                }
              />
              <InputField
                label="Total"
                value={billingForm.total}
                onChange={(value) => setBillingForm((current) => ({ ...current, total: value }))}
              />
              <InputField
                label="Saldo"
                value={billingForm.saldo}
                onChange={(value) => setBillingForm((current) => ({ ...current, saldo: value }))}
              />
              <InputField
                label="Automatica"
                value={billingForm.automatica}
                onChange={(value) =>
                  setBillingForm((current) => ({ ...current, automatica: value as "si" | "no" }))
                }
              />
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Observacion</label>
                <Textarea
                  value={billingForm.observacion}
                  onChange={(event) =>
                    setBillingForm((current) => ({ ...current, observacion: event.target.value }))
                  }
                />
              </div>
            </div>
          ) : null}
          {tab === "cedulones" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                label="Alumno"
                value={cedulonForm.alumno}
                onChange={(value) => setCedulonForm((current) => ({ ...current, alumno: value }))}
              />
              <InputField
                label="Familia"
                value={cedulonForm.familia}
                onChange={(value) => setCedulonForm((current) => ({ ...current, familia: value }))}
              />
              <InputField
                label="Plan"
                value={cedulonForm.plan}
                onChange={(value) => setCedulonForm((current) => ({ ...current, plan: value }))}
              />
              <InputField
                label="Lote"
                value={cedulonForm.lote}
                onChange={(value) => setCedulonForm((current) => ({ ...current, lote: value }))}
              />
              <InputField
                label="Fecha vencimiento"
                value={cedulonForm.fechaVencimiento}
                onChange={(value) =>
                  setCedulonForm((current) => ({ ...current, fechaVencimiento: value }))
                }
              />
              <InputField
                label="Estado"
                value={cedulonForm.estado}
                onChange={(value) =>
                  setCedulonForm((current) => ({
                    ...current,
                    estado: value as LegacySchoolCedulon["estado"],
                  }))
                }
              />
              <InputField
                label="Importe"
                value={cedulonForm.importe}
                onChange={(value) => setCedulonForm((current) => ({ ...current, importe: value }))}
              />
              <InputField
                label="Saldo"
                value={cedulonForm.saldo}
                onChange={(value) => setCedulonForm((current) => ({ ...current, saldo: value }))}
              />
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Gestion</label>
                <Textarea
                  value={cedulonForm.gestion}
                  onChange={(event) =>
                    setCedulonForm((current) => ({ ...current, gestion: event.target.value }))
                  }
                />
              </div>
            </div>
          ) : null}
          {tab === "recibos" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                label="Numero"
                value={receiptForm.numero}
                onChange={(value) => setReceiptForm((current) => ({ ...current, numero: value }))}
              />
              <InputField
                label="Alumno"
                value={receiptForm.alumno}
                onChange={(value) => setReceiptForm((current) => ({ ...current, alumno: value }))}
              />
              <InputField
                label="Caja"
                value={receiptForm.caja}
                onChange={(value) => setReceiptForm((current) => ({ ...current, caja: value }))}
              />
              <InputField
                label="Medio"
                value={receiptForm.medio}
                onChange={(value) => setReceiptForm((current) => ({ ...current, medio: value }))}
              />
              <InputField
                label="Fecha"
                value={receiptForm.fecha}
                onChange={(value) => setReceiptForm((current) => ({ ...current, fecha: value }))}
              />
              <InputField
                label="Estado"
                value={receiptForm.estado}
                onChange={(value) =>
                  setReceiptForm((current) => ({
                    ...current,
                    estado: value as LegacySchoolReceipt["estado"],
                  }))
                }
              />
              <InputField
                label="Total"
                value={receiptForm.total}
                onChange={(value) => setReceiptForm((current) => ({ ...current, total: value }))}
              />
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Aplicado a</label>
                <Textarea
                  value={receiptForm.aplicadoA}
                  onChange={(event) =>
                    setReceiptForm((current) => ({ ...current, aplicadoA: event.target.value }))
                  }
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveCurrentTab}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InputField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}
