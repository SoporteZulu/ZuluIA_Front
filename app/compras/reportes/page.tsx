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
  useComprasAjustes,
  useComprasDevoluciones,
  useComprasNotasCredito,
  useComprasRemitos,
  useCotizacionesCompra,
} from "@/lib/hooks/useCompras"
import { legacyPurchaseAllocations } from "@/lib/compras-legacy-data"

function formatMoney(value: number) {
  return value.toLocaleString("es-AR", { style: "currency", currency: "ARS" })
}

export default function ReportesComprasPage() {
  const {
    cotizaciones,
    loading: loadingCotizaciones,
    refetch: refetchCotizaciones,
  } = useCotizacionesCompra()
  const { remitos, loading: loadingRemitos, refetch: refetchRemitos } = useComprasRemitos()
  const {
    devoluciones,
    loading: loadingDevoluciones,
    refetch: refetchDevoluciones,
  } = useComprasDevoluciones()
  const { notas, loading: loadingNotas, refetch: refetchNotas } = useComprasNotasCredito()
  const { ajustes, loading: loadingAjustes, refetch: refetchAjustes } = useComprasAjustes()

  const totalCotizado = cotizaciones.reduce((acc, item) => acc + item.total, 0)
  const totalDevuelto = devoluciones.reduce((acc, item) => acc + item.total, 0)
  const totalAjustes = ajustes.reduce((acc, item) => acc + item.total, 0)
  const totalImputado = legacyPurchaseAllocations.reduce((acc, item) => acc + item.importe, 0)
  const totalNC = notas.reduce((acc, item) => acc + item.total, 0)
  const pendingQuotes = cotizaciones.filter((item) => item.estado !== "APROBADA").length
  const approvedQuotes = cotizaciones.filter((item) => item.estado === "APROBADA").length
  const pendingReturns = devoluciones.filter((item) => item.estado === "ABIERTA").length
  const remitosWithDiff = remitos.filter((item) =>
    item.items.some((row) => row.diferencia !== 0)
  ).length
  const allocationsObserved = legacyPurchaseAllocations.filter(
    (item) => item.estado === "OBSERVADA"
  ).length
  const creditNotesPending = notas.filter((item) => item.estado !== "APLICADA").length
  const loadingResumen =
    loadingCotizaciones || loadingRemitos || loadingDevoluciones || loadingNotas || loadingAjustes

  const executiveCards = [
    {
      title: "Frente comercial",
      description: `${pendingQuotes} cotizaciones todavía no cerradas y ${approvedQuotes} ya aprobadas comercialmente`,
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
        <Button
          variant="outline"
          className="bg-transparent"
          onClick={() => {
            void refetchCotizaciones()
            void refetchRemitos()
            void refetchDevoluciones()
            void refetchNotas()
            void refetchAjustes()
          }}
        >
          <RefreshCw className="mr-2 h-4 w-4" /> Refrescar reporte
        </Button>
      </div>

      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          Este tablero mezcla cobertura real y legacy. Cotizaciones, remitos, devoluciones, notas de
          crédito y ajustes ya reflejan datos backend; imputaciones todavía siguen sobre la capa
          legacy hasta que exista soporte contable formal.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Cotizaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingResumen ? "..." : formatMoney(totalCotizado)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{pendingQuotes} pendientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Devoluciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingResumen ? "..." : formatMoney(totalDevuelto)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{pendingReturns} abiertas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Ajustes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingResumen ? "..." : formatMoney(totalAjustes)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {ajustes.filter((item) => item.estado !== "APLICADO").length} sin cerrar
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
            <div className="text-2xl font-bold">
              {loadingResumen ? "..." : formatMoney(totalNC)}
            </div>
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
            {cotizaciones.length} cotizaciones reales, {approvedQuotes} aprobadas y {pendingQuotes}{" "}
            pendientes de definición comercial.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4" /> Logística
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {remitos.length} remitos reales visibles, con {remitosWithDiff} casos que todavía
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
            {devoluciones.length} devoluciones y {notas.length} notas de crédito reales visibles
            para seguir impacto físico y económico.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" /> Contable
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {legacyPurchaseAllocations.length} imputaciones siguen en capa legacy y {ajustes.length}{" "}
            ajustes ya salen de backend para lectura operativa.
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
