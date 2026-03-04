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

const mockAccounts = [
  { id: "1", code: "1", name: "ACTIVOS", type: "activo", balance: 125000, level: 0, isActive: true },
  { id: "2", code: "1.1", name: "Activo Corriente", type: "activo", balance: 85000, level: 1, isActive: true },
  { id: "3", code: "1.1.1", name: "Caja", type: "activo", balance: 5000, level: 2, isActive: true },
  { id: "4", code: "1.1.2", name: "Bancos", type: "activo", balance: 45000, level: 2, isActive: true },
  { id: "5", code: "1.1.3", name: "Cuentas por Cobrar", type: "activo", balance: 35000, level: 2, isActive: true },
  { id: "6", code: "2", name: "PASIVOS", type: "pasivo", balance: 45000, level: 0, isActive: true },
  { id: "7", code: "2.1", name: "Pasivo Corriente", type: "pasivo", balance: 45000, level: 1, isActive: true },
  { id: "8", code: "2.1.1", name: "Cuentas por Pagar", type: "pasivo", balance: 30000, level: 2, isActive: true },
  { id: "9", code: "3", name: "PATRIMONIO", type: "patrimonio", balance: 80000, level: 0, isActive: true },
  { id: "10", code: "4", name: "INGRESOS", type: "ingreso", balance: 95000, level: 0, isActive: true },
  { id: "11", code: "5", name: "GASTOS", type: "gasto", balance: 42000, level: 0, isActive: true },
]

function getTypeBadge(type: string) {
  const colors: Record<string, string> = {
    activo: "bg-blue-500/10 text-blue-500",
    pasivo: "bg-red-500/10 text-red-500",
    patrimonio: "bg-green-500/10 text-green-500",
    ingreso: "bg-emerald-500/10 text-emerald-500",
    gasto: "bg-orange-500/10 text-orange-500",
  }
  return <Badge variant="secondary" className={colors[type]}>{type.charAt(0).toUpperCase() + type.slice(1)}</Badge>
}

export default function CuentasPage() {
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
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockAccounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-mono text-sm">{account.code}</TableCell>
                  <TableCell className={account.level === 0 ? "font-bold" : account.level === 1 ? "font-medium pl-4" : "pl-8"}>
                    {account.name}
                  </TableCell>
                  <TableCell>{getTypeBadge(account.type)}</TableCell>
                  <TableCell className="text-right font-mono">${account.balance.toLocaleString()}</TableCell>
                  <TableCell>
                    {account.isActive ? (
                      <Badge variant="secondary" className="bg-green-500/10 text-green-500">Activa</Badge>
                    ) : (
                      <Badge variant="secondary">Inactiva</Badge>
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
                        <DropdownMenuItem>{account.isActive ? "Desactivar" : "Activar"}</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
