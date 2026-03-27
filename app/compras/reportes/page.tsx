"use client"

import Link from "next/link"
import {
  BarChart3,
  CircleDollarSign,
  ClipboardList,
  FileStack,
  PackageX,
  ReceiptText,
  RefreshCw,
  ShieldAlert,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  legacyPurchaseAdjustments,
  legacyPurchaseAllocations,
  legacyPurchaseCreditNotes,
  legacyPurchaseQuotations,
  legacyPurchaseRemitos,
  legacyPurchaseReturns,
} from "@/lib/compras-legacy-data"

function formatMoney(value: number) {
  return value.toLocaleString("es-AR", { style: "currency", currency: "ARS" })
}

export default function ReportesComprasPage() {
  const totalCotizado = legacyPurchaseQuotations.reduce((acc, item) => acc + item.total, 0)
  const totalDevuelto = legacyPurchaseReturns.reduce((acc, item) => acc + item.total, 0)
  const totalAjustes = legacyPurchaseAdjustments.reduce((acc, item) => acc + item.total, 0)
  const totalImputado = legacyPurchaseAllocations.reduce((acc, item) => acc + item.importe, 0)
  const totalNC = legacyPurchaseCreditNotes.reduce((acc, item) => acc + item.total, 0)
  const pendingQuotes = legacyPurchaseQuotations.filter((item) => item.estado !== "APROBADA").length
  const pendingReturns = legacyPurchaseReturns.filter((item) => item.estado === "ABIERTA").length
  const remitosWithDiff = legacyPurchaseRemitos.filter((item) =>
    item.items.some((row) => row.diferencia !== 0)
  ).length
  const allocationsObserved = legacyPurchaseAllocations.filter(
    (item) => item.estado === "OBSERVADA"
  ).length
  const creditNotesPending = legacyPurchaseCreditNotes.filter(
    (item) => item.estado !== "APLICADA"
  ).length

  const executiveCards = [
    {
      title: "Frente comercial",
      description: `${pendingQuotes} cotizaciones todavía no cerradas y ${legacyPurchaseQuotations.filter((item) => item.readyForOrder).length} listas para pasar a orden`,
      value: formatMoney(totalCotizado),
      href: "/compras/cotizaciones",
      icon: FileStack,
    },
    {
      title: "Recepción y excepción",
      description: `${pendingReturns} devoluciones abiertas y ${remitosWithDiff} remitos con diferencias visibles`,
      value: formatMoney(totalDevuelto),
      href: "/compras/devoluciones",
      icon: PackageX,
    },
    {
      title: "Cierre contable",
      description: `${allocationsObserved} imputaciones observadas y ${creditNotesPending} notas pendientes de cierre`,
      value: formatMoney(totalImputado),
      href: "/compras/imputaciones",
      icon: CircleDollarSign,
    },
  ]

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes de compras</h1>
          <p className="text-muted-foreground">
            Resumen ejecutivo del circuito ampliado de compras con foco en huecos operativos y de
            cierre contable todavía no cubiertos por backend.
          </p>
        </div>
        <Button variant="outline" className="bg-transparent">
          <RefreshCw className="mr-2 h-4 w-4" /> Refrescar reporte
        </Button>
      </div>

      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          Este tablero usa la cobertura legacy/local que se fue ampliando módulo por módulo. Sirve
          para visualizar el circuito completo de Compras sin fingir persistencia backend donde hoy
          no existe.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Cotizaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(totalCotizado)}</div>
            <p className="text-xs text-muted-foreground mt-1">{pendingQuotes} pendientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Devoluciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(totalDevuelto)}</div>
            <p className="text-xs text-muted-foreground mt-1">{pendingReturns} abiertas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Ajustes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(totalAjustes)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {legacyPurchaseAdjustments.filter((item) => item.estado !== "APLICADO").length} sin
              cerrar
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Imputaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(totalImputado)}</div>
            <p className="text-xs text-muted-foreground mt-1">{allocationsObserved} observadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Notas crédito</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(totalNC)}</div>
            <p className="text-xs text-muted-foreground mt-1">{creditNotesPending} pendientes</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {executiveCards.map((card) => {
          const Icon = card.icon
          return (
            <Link key={card.title} href={card.href}>
              <Card className="h-full cursor-pointer transition-colors hover:bg-muted/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="h-4 w-4" /> {card.title}
                  </CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{card.value}</div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileStack className="h-4 w-4" /> Comercial
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {legacyPurchaseQuotations.length} cotizaciones,{" "}
            {legacyPurchaseQuotations.filter((item) => item.estado === "APROBADA").length} aprobadas
            y {legacyPurchaseQuotations.filter((item) => item.readyForOrder).length} listas para
            orden.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4" /> Logística
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {legacyPurchaseRemitos.length} remitos visibles, con {remitosWithDiff} casos que todavía
            muestran diferencias por renglón.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ReceiptText className="h-4 w-4" /> Excepciones
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {legacyPurchaseReturns.length} devoluciones y {legacyPurchaseCreditNotes.length} notas
            de crédito visibles para seguir impacto físico y económico.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" /> Contable
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {legacyPurchaseAllocations.length} imputaciones y {legacyPurchaseAdjustments.length}{" "}
            ajustes ya cubren el análisis legado, pero su persistencia sigue pendiente del backend.
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
