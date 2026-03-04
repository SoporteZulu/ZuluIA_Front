import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Boxes, Warehouse, Tags, ArrowLeftRight } from "lucide-react"
import Link from "next/link"

const sections = [
  {
    title: "Productos",
    description: "Gestiona el catalogo de productos, precios y existencias",
    icon: Boxes,
    href: "/inventario/productos",
    stats: "1,234 productos",
  },
  {
    title: "Almacenes",
    description: "Administra las ubicaciones de almacenamiento",
    icon: Warehouse,
    href: "/inventario/almacenes",
    stats: "3 almacenes activos",
  },
  {
    title: "Categorias",
    description: "Organiza los productos por categorias",
    icon: Tags,
    href: "/inventario/categorias",
    stats: "24 categorias",
  },
  {
    title: "Movimientos",
    description: "Registra entradas, salidas y transferencias",
    icon: ArrowLeftRight,
    href: "/inventario/movimientos",
    stats: "156 movimientos este mes",
  },
]

export default function InventarioPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inventario</h1>
        <p className="text-muted-foreground">
          Gestiona el inventario de productos, almacenes y movimientos de stock.
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
