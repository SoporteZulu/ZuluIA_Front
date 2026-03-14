'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Boxes, Warehouse, Tags, ArrowLeftRight } from "lucide-react"
import Link from "next/link"
import { useItems } from "@/lib/hooks/useItems"
import { useDepositos } from "@/lib/hooks/useDepositos"
import { useItemsConfig } from "@/lib/hooks/useItems"
import { useStockMovimientos } from "@/lib/hooks/useStock"

export default function InventarioPage() {
  const { items } = useItems()
  const { depositos } = useDepositos()
  const { categorias } = useItemsConfig()
  const { movimientos } = useStockMovimientos()

  const sections = [
    {
      title: "Productos",
      description: "Gestiona el catalogo de productos, precios y existencias",
      icon: Boxes,
      href: "/inventario/productos",
      stats: `${items.length} productos`,
    },
    {
      title: "Almacenes",
      description: "Administra las ubicaciones de almacenamiento",
      icon: Warehouse,
      href: "/inventario/almacenes",
      stats: `${depositos.filter(d => d.activo).length} almacenes activos`,
    },
    {
      title: "Categorias",
      description: "Organiza los productos por categorias",
      icon: Tags,
      href: "/inventario/categorias",
      stats: `${categorias.length} categorias`,
    },
    {
      title: "Movimientos",
      description: "Registra entradas, salidas y transferencias",
      icon: ArrowLeftRight,
      href: "/inventario/movimientos",
      stats: `${movimientos.length} movimientos`,
    },
  ]
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
