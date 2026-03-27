"use client"

import Link from "next/link"
import { Building2, FileCheck, MapPinned, Network, School, UsersRound } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { legacyJurisdictions, legacySucursalContacts } from "@/lib/legacy-masters-data"
import { useSucursales } from "@/lib/hooks/useSucursales"

const quickAccess = [
  {
    title: "Jurisdicciones",
    description: "Padron fiscal y convenios heredados del sistema viejo.",
    href: "/maestros/jurisdicciones",
    icon: MapPinned,
  },
  {
    title: "Sucursales",
    description: "Maestro real de sedes con overlay legacy de contactos y circuito colegio.",
    href: "/maestros/sucursales",
    icon: Building2,
  },
  {
    title: "Colegio",
    description: "Acceso cruzado al vertical legacy rearmado por circuito funcional.",
    href: "/colegio",
    icon: School,
  },
]

export default function MaestrosPage() {
  const { sucursales, loading } = useSucursales(false)
  const activeBranches = sucursales.filter((branch) => branch.activo).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Maestros Legacy</h1>
        <p className="mt-1 text-muted-foreground">
          Bloque de reemplazo para maestros ausentes en el frontend nuevo. Usa API real donde ya
          existe y datasets locales honestos cuando el backend todavia no publica el contrato.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sucursales visibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : sucursales.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">{activeBranches} activas en API</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Jurisdicciones legacy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{legacyJurisdictions.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">Padron local hasta exponer backend</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Contactos de sedes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{legacySucursalContacts.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">Overlay legado por circuito</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cobertura de request</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3/3</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Dashboard, jurisdicciones y sucursales
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Accesos directos</CardTitle>
            <CardDescription>
              Se agrupan por circuito funcional para evitar una migracion atomizada de formularios.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {quickAccess.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className="rounded-lg border p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icon className="h-4 w-4" /> {item.title}
                  </div>
                  <p className="mt-3 font-semibold">{item.title}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                </Link>
              )
            })}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Network className="h-4 w-4" /> Criterio aplicado
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Sucursales usa API real existente. Jurisdicciones y contactos complementarios siguen
              en modo local porque el backend actual no publica ese maestro ni las relaciones de
              contacto heredadas.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UsersRound className="h-4 w-4" /> Sedes destacadas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(sucursales.slice(0, 3) || []).map((branch) => (
                <div key={branch.id} className="rounded-lg border p-3">
                  <p className="font-medium">{branch.descripcion}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {branch.razonSocial ?? "Sin razon social visible"}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileCheck className="h-4 w-4" /> Cobertura directa
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              El maestro de depositos del legacy se considera cubierto por las pantallas ya
              existentes en Inventario y Almacenes, por lo que este bloque nuevo se concentra en lo
              que todavia no era navegable como modulo propio.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
