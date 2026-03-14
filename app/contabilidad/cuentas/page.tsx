"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, MoreHorizontal, FolderTree } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { usePlanCuentasAll } from "@/lib/hooks/useAsientos"
import { useEjercicioVigente } from "@/lib/hooks/useEjercicios"

function getTypeBadge(type: string | null) {
  if (!type) return <Badge variant="secondary">-</Badge>
  const colors: Record<string, string> = {
    activo:    "bg-blue-500/10 text-blue-500",
    pasivo:    "bg-red-500/10 text-red-500",
    patrimonio:"bg-green-500/10 text-green-500",
    ingreso:   "bg-emerald-500/10 text-emerald-500",
    gasto:     "bg-orange-500/10 text-orange-500",
  }
  const lower = type.toLowerCase()
  const cls = Object.entries(colors).find(([k]) => lower.includes(k))?.[1] ?? ''
  return <Badge variant="secondary" className={cls}>{type}</Badge>
}

export default function CuentasPage() {
  const { ejercicio } = useEjercicioVigente()
  const { cuentas, loading, error } = usePlanCuentasAll(ejercicio?.id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plan de Cuentas</h1>
          <p className="text-muted-foreground">
            Administra el catalogo de cuentas contables.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Cuenta
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FolderTree className="h-4 w-4" />
            Estructura de Cuentas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codigo</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Imputable</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Cargando cuentas...</TableCell></TableRow>
              )}
              {error && (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-destructive">{error}</TableCell></TableRow>
              )}
              {!loading && !error && cuentas.map((cuenta) => (
                <TableRow key={cuenta.id}>
                  <TableCell className="font-mono text-sm">{cuenta.codigoCuenta}</TableCell>
                  <TableCell className={cuenta.nivel === 1 ? "font-bold" : cuenta.nivel === 2 ? "font-medium pl-4" : "pl-8"}>
                    {cuenta.denominacion}
                  </TableCell>
                  <TableCell>{getTypeBadge(cuenta.tipo)}</TableCell>
                  <TableCell>
                    {cuenta.imputable ? (
                      <Badge variant="secondary" className="bg-green-500/10 text-green-500">Imputable</Badge>
                    ) : (
                      <Badge variant="secondary">Integradora</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Ver movimientos</DropdownMenuItem>
                        <DropdownMenuItem>Editar</DropdownMenuItem>
                        <DropdownMenuItem>Agregar subcuenta</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && !error && cuentas.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No hay cuentas contables.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
