"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  crmClients,
  crmOpportunities,
  crmInteractions,
  crmCampaigns,
  crmUsers,
  getUserById,
} from "@/lib/crm-data"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
} from "recharts"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]

export default function ReportesPage() {
  const [periodo, setPeriodo] = useState("mes")

  // Calculos para reportes comerciales
  const oportunidadesPorEtapa = [
    { etapa: "Lead", cantidad: crmOpportunities.filter(o => o.etapa === "lead").length, monto: crmOpportunities.filter(o => o.etapa === "lead").reduce((s, o) => s + o.montoEstimado, 0) },
    { etapa: "Calificado", cantidad: crmOpportunities.filter(o => o.etapa === "calificado").length, monto: crmOpportunities.filter(o => o.etapa === "calificado").reduce((s, o) => s + o.montoEstimado, 0) },
    { etapa: "Propuesta", cantidad: crmOpportunities.filter(o => o.etapa === "propuesta").length, monto: crmOpportunities.filter(o => o.etapa === "propuesta").reduce((s, o) => s + o.montoEstimado, 0) },
    { etapa: "Negociacion", cantidad: crmOpportunities.filter(o => o.etapa === "negociacion").length, monto: crmOpportunities.filter(o => o.etapa === "negociacion").reduce((s, o) => s + o.montoEstimado, 0) },
    { etapa: "Ganado", cantidad: crmOpportunities.filter(o => o.etapa === "cerrado_ganado").length, monto: crmOpportunities.filter(o => o.etapa === "cerrado_ganado").reduce((s, o) => s + o.montoEstimado, 0) },
    { etapa: "Perdido", cantidad: crmOpportunities.filter(o => o.etapa === "cerrado_perdido").length, monto: crmOpportunities.filter(o => o.etapa === "cerrado_perdido").reduce((s, o) => s + o.montoEstimado, 0) },
  ]

  // Ranking de vendedores
  const vendedoresStats = crmUsers
    .filter(u => u.rol === "comercial" || u.rol === "administrador")
    .map(user => {
      const oppsGanadas = crmOpportunities.filter(o => o.responsableId === user.id && o.etapa === "cerrado_ganado")
      const montoGanado = oppsGanadas.reduce((s, o) => s + o.montoEstimado, 0)
      const oppsActivas = crmOpportunities.filter(o => o.responsableId === user.id && !["cerrado_ganado", "cerrado_perdido"].includes(o.etapa))
      return {
        id: user.id,
        nombre: `${user.nombre} ${user.apellido}`,
        oportunidadesGanadas: oppsGanadas.length,
        montoGanado,
        oportunidadesActivas: oppsActivas.length,
        pipeline: oppsActivas.reduce((s, o) => s + o.montoEstimado, 0),
      }
    })
    .sort((a, b) => b.montoGanado - a.montoGanado)

  // Clientes por segmento
  const clientesPorSegmento = [
    { segmento: "PYME", cantidad: crmClients.filter(c => c.segmento === "pyme").length },
    { segmento: "Corporativo", cantidad: crmClients.filter(c => c.segmento === "corporativo").length },
    { segmento: "Gobierno", cantidad: crmClients.filter(c => c.segmento === "gobierno").length },
    { segmento: "Startup", cantidad: crmClients.filter(c => c.segmento === "startup").length },
  ]

  // Clientes por industria
  const industriasMap = new Map<string, number>()
  crmClients.forEach(c => {
    if (c.industria) {
      industriasMap.set(c.industria, (industriasMap.get(c.industria) || 0) + 1)
    }
  })
  const clientesPorIndustria = Array.from(industriasMap.entries())
    .map(([industria, cantidad]) => ({ industria, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)

  // Resultados de campanas
  const campanasStats = crmCampaigns.map(c => ({
    nombre: c.nombre,
    tipo: c.tipoCampana,
    presupuesto: c.presupuestoEstimado,
    gastado: c.presupuestoGastado,
    leads: c.leadsGenerados,
    oportunidades: c.oportunidadesGeneradas,
    negocios: c.negociosGanados,
    roi: c.presupuestoGastado > 0 ? ((c.negociosGanados * 10000 - c.presupuestoGastado) / c.presupuestoGastado * 100).toFixed(1) : 0,
  }))

  // Interacciones por usuario
  const interaccionesPorUsuario = crmUsers.map(user => {
    const interacciones = crmInteractions.filter(i => i.usuarioResponsableId === user.id)
    return {
      usuario: `${user.nombre} ${user.apellido}`,
      llamadas: interacciones.filter(i => i.tipoInteraccion === "llamada").length,
      emails: interacciones.filter(i => i.tipoInteraccion === "email").length,
      reuniones: interacciones.filter(i => i.tipoInteraccion === "reunion").length,
      visitas: interacciones.filter(i => i.tipoInteraccion === "visita").length,
      total: interacciones.length,
    }
  }).filter(u => u.total > 0)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reportes CRM</h1>
          <p className="text-muted-foreground">Analisis y metricas del negocio</p>
        </div>
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Periodo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semana">Esta semana</SelectItem>
            <SelectItem value="mes">Este mes</SelectItem>
            <SelectItem value="trimestre">Este trimestre</SelectItem>
            <SelectItem value="ano">Este año</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="comercial" className="space-y-4">
        <TabsList>
          <TabsTrigger value="comercial">Comercial</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
          <TabsTrigger value="actividad">Actividad</TabsTrigger>
        </TabsList>

        {/* Reportes Comerciales */}
        <TabsContent value="comercial" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Oportunidades por Etapa */}
            <Card>
              <CardHeader>
                <CardTitle>Oportunidades por Etapa</CardTitle>
                <CardDescription>Cantidad y monto por etapa del pipeline</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={oportunidadesPorEtapa}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="etapa" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" />
                      <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="cantidad" fill="#3b82f6" name="Cantidad" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="right" dataKey="monto" fill="#10b981" name="Monto (USD)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Probabilidad de Cierre */}
            <Card>
              <CardHeader>
                <CardTitle>Distribucion por Probabilidad</CardTitle>
                <CardDescription>Oportunidades agrupadas por probabilidad de cierre</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "0-25%", value: crmOpportunities.filter(o => o.probabilidad <= 25).length },
                          { name: "26-50%", value: crmOpportunities.filter(o => o.probabilidad > 25 && o.probabilidad <= 50).length },
                          { name: "51-75%", value: crmOpportunities.filter(o => o.probabilidad > 50 && o.probabilidad <= 75).length },
                          { name: "76-100%", value: crmOpportunities.filter(o => o.probabilidad > 75).length },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ranking de Vendedores */}
          <Card>
            <CardHeader>
              <CardTitle>Ranking de Vendedores</CardTitle>
              <CardDescription>Rendimiento del equipo comercial</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-right">Opps. Ganadas</TableHead>
                    <TableHead className="text-right">Monto Ganado</TableHead>
                    <TableHead className="text-right">Opps. Activas</TableHead>
                    <TableHead className="text-right">Pipeline</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendedoresStats.map((vendedor, index) => (
                    <TableRow key={vendedor.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Badge variant={index === 0 ? "default" : "secondary"}>
                            #{index + 1}
                          </Badge>
                          {vendedor.nombre}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{vendedor.oportunidadesGanadas}</TableCell>
                      <TableCell className="text-right font-medium text-green-500">
                        {formatCurrency(vendedor.montoGanado)}
                      </TableCell>
                      <TableCell className="text-right">{vendedor.oportunidadesActivas}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(vendedor.pipeline)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reportes de Marketing */}
        <TabsContent value="marketing" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Clientes por Segmento */}
            <Card>
              <CardHeader>
                <CardTitle>Clientes por Segmento</CardTitle>
                <CardDescription>Distribucion de la cartera</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={clientesPorSegmento}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="cantidad"
                        nameKey="segmento"
                        label={({ segmento, cantidad }) => `${segmento}: ${cantidad}`}
                      >
                        {clientesPorSegmento.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Clientes por Industria */}
            <Card>
              <CardHeader>
                <CardTitle>Clientes por Industria</CardTitle>
                <CardDescription>Top industrias</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={clientesPorIndustria} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                      <YAxis dataKey="industria" type="category" stroke="hsl(var(--muted-foreground))" width={100} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                      <Bar dataKey="cantidad" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Resultados de Campanas */}
          <Card>
            <CardHeader>
              <CardTitle>Resultados de Campañas</CardTitle>
              <CardDescription>Performance de campañas de marketing</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaña</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Presupuesto</TableHead>
                    <TableHead className="text-right">Gastado</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">Oportunidades</TableHead>
                    <TableHead className="text-right">Negocios</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campanasStats.map((campana, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{campana.nombre}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{campana.tipo}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(campana.presupuesto)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(campana.gastado)}</TableCell>
                      <TableCell className="text-right">{campana.leads}</TableCell>
                      <TableCell className="text-right">{campana.oportunidades}</TableCell>
                      <TableCell className="text-right font-medium text-green-500">
                        {campana.negocios}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reportes de Actividad */}
        <TabsContent value="actividad" className="space-y-4">
          {/* Interacciones por Usuario */}
          <Card>
            <CardHeader>
              <CardTitle>Actividad por Usuario</CardTitle>
              <CardDescription>Interacciones registradas por cada miembro del equipo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={interaccionesPorUsuario}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="usuario" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                    <Legend />
                    <Bar dataKey="llamadas" stackId="a" fill="#3b82f6" name="Llamadas" />
                    <Bar dataKey="emails" stackId="a" fill="#10b981" name="Emails" />
                    <Bar dataKey="reuniones" stackId="a" fill="#f59e0b" name="Reuniones" />
                    <Bar dataKey="visitas" stackId="a" fill="#8b5cf6" name="Visitas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Tabla detallada */}
          <Card>
            <CardHeader>
              <CardTitle>Detalle de Actividad</CardTitle>
              <CardDescription>Desglose por tipo de interaccion</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead className="text-right">Llamadas</TableHead>
                    <TableHead className="text-right">Emails</TableHead>
                    <TableHead className="text-right">Reuniones</TableHead>
                    <TableHead className="text-right">Visitas</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {interaccionesPorUsuario.map((usuario, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{usuario.usuario}</TableCell>
                      <TableCell className="text-right">{usuario.llamadas}</TableCell>
                      <TableCell className="text-right">{usuario.emails}</TableCell>
                      <TableCell className="text-right">{usuario.reuniones}</TableCell>
                      <TableCell className="text-right">{usuario.visitas}</TableCell>
                      <TableCell className="text-right font-bold">{usuario.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
