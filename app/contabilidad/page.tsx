import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Wallet, PiggyBank, BarChart3 } from "lucide-react"
import Link from "next/link"

const sections = [
  {
    title: "Plan de Cuentas",
    description: "Administra el catalogo de cuentas contables",
    icon: BookOpen,
    href: "/contabilidad/cuentas",
    stats: "156 cuentas activas",
  },
  {
    title: "Asientos",
    description: "Registra asientos contables y diarios",
    icon: Wallet,
    href: "/contabilidad/asientos",
    stats: "234 asientos este mes",
  },
  {
    title: "Pagos y Cobros",
    description: "Gestiona pagos a proveedores y cobros a clientes",
    icon: PiggyBank,
    href: "/contabilidad/pagos",
    stats: "$18,500 por cobrar",
  },
  {
    title: "Reportes",
    description: "Genera estados financieros y reportes",
    icon: BarChart3,
    href: "/contabilidad/reportes",
    stats: "Balance actualizado",
  },
]

export default function ContabilidadPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Contabilidad</h1>
        <p className="text-muted-foreground">
          Gestiona cuentas, asientos contables y reportes financieros.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <Link key={section.title} href={section.href}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{section.title}</CardTitle>
                  </div>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium text-muted-foreground">{section.stats}</p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
