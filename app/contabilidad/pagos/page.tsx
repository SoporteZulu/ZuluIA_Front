"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Search, Filter, MoreHorizontal, ArrowDownLeft, ArrowUpRight } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import Loading from "./loading"

const mockPayments = [
  { id: "1", number: "PAG-001", date: "2024-01-15", type: "pago", entity: "Tech Supplies Inc.", amount: 5200, method: "transferencia", reference: "TRF-12345" },
  { id: "2", number: "PAG-002", date: "2024-01-14", type: "pago", entity: "Office World", amount: 3400, method: "cheque", reference: "CHQ-001" },
  { id: "3", number: "PAG-003", date: "2024-01-13", type: "pago", entity: "Global Electronics", amount: 8900, method: "transferencia", reference: "TRF-12346" },
]

const mockCollections = [
  { id: "1", number: "COB-001", date: "2024-01-15", type: "cobro", entity: "Empresa ABC S.A.", amount: 2500, method: "transferencia", reference: "DEP-001" },
  { id: "2", number: "COB-002", date: "2024-01-14", type: "cobro", entity: "Comercial XYZ", amount: 1200, method: "efectivo", reference: "REC-001" },
  { id: "3", number: "COB-003", date: "2024-01-13", type: "cobro", entity: "Importadora Delta", amount: 4500, method: "cheque", reference: "CHQ-REC-001" },
  { id: "4", number: "COB-004", date: "2024-01-12", type: "cobro", entity: "Tecnologias Beta", amount: 5000, method: "transferencia", reference: "DEP-002" },
]

function getMethodBadge(method: string) {
  switch (method) {
    case "efectivo":
      return <Badge variant="secondary" className="bg-green-500/10 text-green-500">Efectivo</Badge>
    case "transferencia":
      return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">Transferencia</Badge>
    case "cheque":
      return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500">Cheque</Badge>
    case "tarjeta":
      return <Badge variant="secondary" className="bg-purple-500/10 text-purple-500">Tarjeta</Badge>
    default:
      return null
  }
}

function PaymentTable({ data, type }: { data: typeof mockPayments; type: "pago" | "cobro" }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Numero</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead>{type === "pago" ? "Proveedor" : "Cliente"}</TableHead>
          <TableHead className="text-right">Monto</TableHead>
          <TableHead>Metodo</TableHead>
          <TableHead>Referencia</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-mono text-sm">{item.number}</TableCell>
            <TableCell className="text-muted-foreground">{item.date}</TableCell>
            <TableCell className="font-medium">{item.entity}</TableCell>
            <TableCell className="text-right font-medium">${item.amount.toLocaleString()}</TableCell>
            <TableCell>{getMethodBadge(item.method)}</TableCell>
            <TableCell className="font-mono text-sm">{item.reference}</TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Ver detalles</DropdownMenuItem>
                  <DropdownMenuItem>Imprimir recibo</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">Anular</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default function PagosPage() {
  const searchParams = useSearchParams()

  return (
    <Suspense fallback={<Loading />}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pagos y Cobros</h1>
            <p className="text-muted-foreground">
              Gestiona pagos a proveedores y cobros de clientes.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <ArrowUpRight className="mr-2 h-4 w-4" />
              Nuevo Pago
            </Button>
            <Button>
              <ArrowDownLeft className="mr-2 h-4 w-4" />
              Nuevo Cobro
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total por Pagar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">$30,200</div>
              <p className="text-xs text-muted-foreground">12 facturas pendientes</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total por Cobrar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">$18,450</div>
              <p className="text-xs text-muted-foreground">8 facturas pendientes</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar transacciones..." className="pl-8" />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="cobros" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="cobros">Cobros</TabsTrigger>
                <TabsTrigger value="pagos">Pagos</TabsTrigger>
              </TabsList>
              <TabsContent value="cobros">
                <PaymentTable data={mockCollections} type="cobro" />
              </TabsContent>
              <TabsContent value="pagos">
                <PaymentTable data={mockPayments} type="pago" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Suspense>
  )
}
