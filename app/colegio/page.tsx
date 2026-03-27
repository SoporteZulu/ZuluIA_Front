"use client"

import Link from "next/link"
import { CreditCard, FileSpreadsheet, Layers3, ReceiptText, School } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  legacySchoolBillings,
  legacySchoolCedulones,
  legacySchoolLots,
  legacySchoolPlans,
  legacySchoolReceipts,
} from "@/lib/legacy-masters-data"

const sections = [
  {
    title: "Cartera",
    href: "/colegio/cartera",
    description:
      "Facturacion, cedulones, cancelacion de deuda, Cobinpro y recibos en un solo circuito.",
    icon: CreditCard,
  },
  {
    title: "Planes y Lotes",
    href: "/colegio/planes",
    description: "Planes generales, planes de pago, generacion, listados, lotes y fin de proyecto.",
    icon: Layers3,
  },
]

export default function ColegioDashboardPage() {
  const openBills = legacySchoolBillings.filter((row) => row.saldo > 0).length
  const openCedulones = legacySchoolCedulones.filter((row) => row.saldo > 0).length
  const activePlans = legacySchoolPlans.filter((row) => row.estado === "vigente").length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Colegio</h1>
        <p className="mt-1 text-muted-foreground">
          Vertical legacy reagrupado por circuitos funcionales para reemplazar formularios VB6 sin
          multiplicar pantallas aisladas. Todo el modulo trabaja con dataset local mientras el
          backend actual no publica contratos educativos dedicados.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Facturacion abierta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openBills}</div>
            <p className="mt-1 text-xs text-muted-foreground">Comprobantes con saldo visible</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cedulones pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openCedulones}</div>
            <p className="mt-1 text-xs text-muted-foreground">Emision y gestion de deuda</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Planes vigentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activePlans}</div>
            <p className="mt-1 text-xs text-muted-foreground">Cobertura del ciclo lectivo actual</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Lotes visibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{legacySchoolLots.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Generacion y control administrativo
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Circuitos disponibles</CardTitle>
            <CardDescription>
              Cada bloque resume varios formularios del sistema viejo bajo un flujo operativo comun.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {sections.map((section) => {
              const Icon = section.icon
              return (
                <Link
                  key={section.title}
                  href={section.href}
                  className="rounded-lg border p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icon className="h-4 w-4" /> {section.title}
                  </div>
                  <p className="mt-3 font-semibold">{section.title}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{section.description}</p>
                </Link>
              )
            })}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <School className="h-4 w-4" /> Formularios legacy cubiertos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Facturacion + Facturacion automatica + Fin de proyecto</p>
              <p>Cedulones + Cancelacion de deuda + Cobinpro</p>
              <p>Planes generales + Planes de pago</p>
              <p>Recibos + Generacion + Listados + Lotes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ReceiptText className="h-4 w-4" /> Trazabilidad actual
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              La vista prioriza cobertura funcional y navegabilidad. No inventa backend educativo:
              conserva datasets locales persistidos para que el circuito pueda revisarse y operarse
              hasta publicar APIs especificas.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSpreadsheet className="h-4 w-4" /> Actividad visible
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>{legacySchoolReceipts.length} recibos operativos en cartera.</p>
              <p>{legacySchoolBillings.length} comprobantes de referencia para control.</p>
              <p>{legacySchoolCedulones.length} cedulones o gestiones de deuda visibles.</p>
              <p>
                {legacySchoolPlans.length} planes heredados listos para consulta y ajustes locales.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
