"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, MapPin, Package, MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useDepositos } from "@/lib/hooks/useDepositos"

export default function AlmacenesPage() {
  const { depositos, loading, error } = useDepositos()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Almacenes</h1>
          <p className="text-muted-foreground">
            Administra las ubicaciones de almacenamiento.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Almacen
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading && (
          <p className="text-muted-foreground col-span-3 text-sm py-10 text-center">Cargando depósitos...</p>
        )}
        {error && (
          <p className="text-destructive col-span-3 text-sm py-10 text-center">{error}</p>
        )}
        {!loading && !error && depositos.map((deposito) => (
          <Card key={deposito.id} className={!deposito.activo ? "opacity-60" : ""}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{deposito.descripcion}</CardTitle>
                  {deposito.activo ? (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-500">Activo</Badge>
                  ) : (
                    <Badge variant="secondary">Inactivo</Badge>
                  )}
                  {deposito.esDefault && (
                    <Badge variant="outline" className="text-xs">Predeterminado</Badge>
                  )}
                </div>
                <CardDescription className="font-mono text-xs">DEP-{String(deposito.id).padStart(3, '0')}</CardDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Ver inventario</DropdownMenuItem>
                  <DropdownMenuItem>Editar</DropdownMenuItem>
                  <DropdownMenuItem>{deposito.activo ? "Desactivar" : "Activar"}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>Sucursal #{deposito.sucursalId}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">ID</p>
                  <p className="text-lg font-semibold font-mono">#{deposito.id}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Sucursal ID</p>
                  <p className="text-lg font-semibold">{deposito.sucursalId}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {!loading && !error && depositos.length === 0 && (
          <p className="text-muted-foreground col-span-3 text-sm py-10 text-center">No se encontraron depósitos.</p>
        )}
      </div>
    </div>
  )
}
