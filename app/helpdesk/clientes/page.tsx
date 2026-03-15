"use client"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, X, Users, Crown, UserCheck, UserMinus, Phone, Mail, Building2, ExternalLink, FileText } from "lucide-react"
import { useCrmClientes } from "@/lib/hooks/useCrm"
import { useHdContratos, useHdSlas } from "@/lib/hooks/useHelpdesk"
import type { CRMClient } from "@/lib/types"

function mapClienteToHDType(cliente: CRMClient): 'vip' | 'estandar' | 'basico' {
  if (cliente.segmento === 'corporativo' || cliente.segmento === 'gobierno') return 'vip'
  if (cliente.segmento === 'pyme') return 'estandar'
  return 'basico'
}
import Link from "next/link"

const tipoClienteLabels = {
  vip: "VIP",
  estandar: "Estándar",
  basico: "Básico",
}

const tipoClienteColors = {
  vip: "bg-amber-500/10 text-amber-500",
  estandar: "bg-blue-500/10 text-blue-500",
  basico: "bg-slate-500/10 text-slate-500",
}

function ClientesHDContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [filterTipo, setFilterTipo] = useState<string>("all")
  const [filterContrato, setFilterContrato] = useState<string>("all")

  // Obtener solo clientes activos o prospectos del CRM
  const { clientes: crmClients, loading } = useCrmClientes()
  const { contratos } = useHdContratos()
  const { slas } = useHdSlas()

  const clientesActivos = crmClients.filter(c => c.tipoCliente === "activo" || c.tipoCliente === "prospecto")

  // Mapear clientes con información de Help Desk
  const clientesConHD = clientesActivos.map(cliente => {
    const tipoHD = mapClienteToHDType(cliente)
    const sla = slas.find(s => s.tipoCliente === mapClienteToHDType(cliente) && s.estado === 'activo')
    const contratosCliente = contratos.filter(c => c.clienteId === cliente.id)
    const contratoActivo = contratosCliente.some(c => c.estado === "activo")
    const limiteTickets = tipoHD === "vip" ? 100 : tipoHD === "estandar" ? 50 : 20

    return {
      ...cliente,
      tipoHD,
      sla,
      contratosCliente,
      contratoActivo,
      limiteTickets,
      ticketsUsados: Math.floor(Math.random() * limiteTickets * 0.6), // Mock data
    }
  })

  const filteredClientes = clientesConHD.filter(cliente => {
    const matchesSearch = cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.emailPrincipal?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.cuit?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTipo = filterTipo === "all" || cliente.tipoHD === filterTipo
    const matchesContrato = filterContrato === "all" || 
      (filterContrato === "activo" && cliente.contratoActivo) ||
      (filterContrato === "inactivo" && !cliente.contratoActivo)
    return matchesSearch && matchesTipo && matchesContrato
  })

  const stats = {
    total: clientesConHD.length,
    vip: clientesConHD.filter(c => c.tipoHD === "vip").length,
    estandar: clientesConHD.filter(c => c.tipoHD === "estandar").length,
    basico: clientesConHD.filter(c => c.tipoHD === "basico").length,
    conContrato: clientesConHD.filter(c => c.contratoActivo).length,
  }

  const clearFilters = () => {
    setSearchTerm("")
    setFilterTipo("all")
    setFilterContrato("all")
  }

  const hasActiveFilters = searchTerm || filterTipo !== "all" || filterContrato !== "all"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clientes Help Desk</h1>
          <p className="text-muted-foreground">Clientes del CRM con información de soporte y contratos</p>
        </div>
        <Link href="/crm/clientes">
          <Button variant="outline">
            <ExternalLink className="mr-2 h-4 w-4" />
            Gestionar en CRM
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VIP</CardTitle>
            <Crown className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.vip}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estándar</CardTitle>
            <UserCheck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.estandar}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Básico</CardTitle>
            <UserMinus className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.basico}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Con Contrato</CardTitle>
            <Building2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conContrato}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, email o CUIT..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="vip">VIP</SelectItem>
                <SelectItem value="estandar">Estándar</SelectItem>
                <SelectItem value="basico">Básico</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterContrato} onValueChange={setFilterContrato}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Contrato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="activo">Con Contrato</SelectItem>
                <SelectItem value="inactivo">Sin Contrato</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Clientes</CardTitle>
          <CardDescription>
            {filteredClientes.length} cliente(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo HD</TableHead>
                <TableHead>Segmento</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>Contratos</TableHead>
                <TableHead>Tickets Mes</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClientes.map((cliente) => (
                <TableRow key={cliente.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{cliente.nombre}</div>
                      <div className="text-sm text-muted-foreground">{cliente.cuit}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={tipoClienteColors[cliente.tipoHD]}>
                      {tipoClienteLabels[cliente.tipoHD]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{cliente.segmento}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm">
                      {cliente.emailPrincipal && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="h-3 w-3" /> {cliente.emailPrincipal}
                        </span>
                      )}
                      {cliente.telefonoPrincipal && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3 w-3" /> {cliente.telefonoPrincipal}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {cliente.sla ? (
                      <Badge variant="outline" className="text-xs">
                        {cliente.sla.nombre}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">Sin SLA</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {cliente.contratoActivo ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="default">Activo</Badge>
                        <span className="text-xs text-muted-foreground">
                          ({cliente.contratosCliente.filter(c => c.estado === "activo").length})
                        </span>
                      </div>
                    ) : (
                      <Badge variant="secondary">Sin Contrato</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={cliente.ticketsUsados >= cliente.limiteTickets * 0.8 ? "text-destructive font-medium" : ""}>
                        {cliente.ticketsUsados} / {cliente.limiteTickets}
                      </span>
                      {cliente.ticketsUsados >= cliente.limiteTickets * 0.8 && (
                        <Badge variant="destructive" className="text-xs">Alto</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/crm/clientes/${cliente.id}`}>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Ver en CRM
                        </Button>
                      </Link>
                      <Link href={`/helpdesk/contratos?cliente=${cliente.id}`}>
                        <Button variant="ghost" size="sm">
                          <FileText className="h-4 w-4 mr-1" />
                          Contratos
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredClientes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No se encontraron clientes con los filtros aplicados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ClientesHDPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-muted-foreground">Cargando...</div>}>
      <ClientesHDContent />
    </Suspense>
  )
}
