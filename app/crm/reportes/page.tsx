"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useCrmClientes, useCrmOportunidades, useCrmInteracciones, useCrmCampanas, useCrmUsuarios } from "@/lib/hooks/useCrm"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]
const fmt = (v: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(v)

export default function ReportesPage() {
  const { clientes } = useCrmClientes()
  const { oportunidades } = useCrmOportunidades()
  const { interacciones } = useCrmInteracciones()
  const { campanas } = useCrmCampanas()
  const { usuarios } = useCrmUsuarios()

  const oportunidadesPorEtapa = useMemo(() => [
    "lead", "calificado", "propuesta", "negociacion", "cerrado_ganado", "cerrado_perdido"
  ].map(etapa => ({
    etapa: etapa.replace("cerrado_", "").replace("_", " "),
    cantidad: oportunidades.filter(o => o.etapa === etapa).length,
    monto: oportunidades.filter(o => o.etapa === etapa).reduce((s, o) => s + Number(o.montoEstimado ?? 0), 0),
  })), [oportunidades])

  const vendedoresStats = useMemo(() => usuarios
    .filter(u => u.rol === "comercial" || u.rol === "administrador")
    .map(user => {
      const ganadas = oportunidades.filter(o => o.responsableId === user.id && o.etapa === "cerrado_ganado")
      const activas = oportunidades.filter(o => o.responsableId === user.id && !["cerrado_ganado", "cerrado_perdido"].includes(o.etapa))
      return {
        id: user.id,
        nombre: `${user.nombre} ${user.apellido}`,
        oportunidadesGanadas: ganadas.length,
        montoGanado: ganadas.reduce((s, o) => s + Number(o.montoEstimado ?? 0), 0),
        oportunidadesActivas: activas.length,
        pipeline: activas.reduce((s, o) => s + Number(o.montoEstimado ?? 0), 0),
      }
    })
    .sort((a, b) => b.montoGanado - a.montoGanado), [usuarios, oportunidades])

  const clientesPorSegmento = useMemo(() => {
    const map = new Map<string, number>()
    clientes.forEach(c => { if (c.segmento) map.set(c.segmento, (map.get(c.segmento) ?? 0) + 1) })
    return Array.from(map.entries()).map(([segmento, cantidad]) => ({ segmento, cantidad }))
  }, [clientes])

  const clientesPorIndustria = useMemo(() => {
    const map = new Map<string, number>()
    clientes.forEach(c => { if (c.industria) map.set(c.industria, (map.get(c.industria) ?? 0) + 1) })
    return Array.from(map.entries()).map(([industria, cantidad]) => ({ industria, cantidad })).sort((a, b) => b.cantidad - a.cantidad)
  }, [clientes])

  const interaccionesPorUsuario = useMemo(() => usuarios
    .map(user => {
      const ui = interacciones.filter(i => i.usuarioResponsableId === user.id)
      return {
        usuario: `${user.nombre} ${user.apellido}`,
        llamadas: ui.filter(i => i.tipoInteraccion === "llamada").length,
        emails: ui.filter(i => i.tipoInteraccion === "email").length,
        reuniones: ui.filter(i => i.tipoInteraccion === "reunion").length,
        visitas: ui.filter(i => i.tipoInteraccion === "visita").length,
        total: ui.length,
      }
    }).filter(u => u.total > 0), [usuarios, interacciones])

  const probabilidadData = useMemo(() => [
    { name: "0-25%", value: oportunidades.filter(o => o.probabilidad <= 25).length },
    { name: "26-50%", value: oportunidades.filter(o => o.probabilidad > 25 && o.probabilidad <= 50).length },
    { name: "51-75%", value: oportunidades.filter(o => o.probabilidad > 50 && o.probabilidad <= 75).length },
    { name: "76-100%", value: oportunidades.filter(o => o.probabilidad > 75).length },
  ], [oportunidades])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reportes CRM</h1>
        <p className="text-muted-foreground">Análisis y métricas del negocio</p>
      </div>

      <Tabs defaultValue="comercial" className="space-y-4">
        <TabsList>
          <TabsTrigger value="comercial">Comercial</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
          <TabsTrigger value="actividad">Actividad</TabsTrigger>
        </TabsList>

        <TabsContent value="comercial" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
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
            <Card>
              <CardHeader>
                <CardTitle>Distribución por Probabilidad</CardTitle>
                <CardDescription>Oportunidades agrupadas por probabilidad de cierre</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={probabilidadData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {COLORS.map((color, i) => <Cell key={i} fill={color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
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
                  {vendedoresStats.map((v, i) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Badge variant={i === 0 ? "default" : "secondary"}>#{i + 1}</Badge>
                          {v.nombre}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{v.oportunidadesGanadas}</TableCell>
                      <TableCell className="text-right font-medium text-green-500">{fmt(v.montoGanado)}</TableCell>
                      <TableCell className="text-right">{v.oportunidadesActivas}</TableCell>
                      <TableCell className="text-right">{fmt(v.pipeline)}</TableCell>
                    </TableRow>
                  ))}
                  {vendedoresStats.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Sin datos disponibles</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="marketing" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Clientes por Segmento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={clientesPorSegmento} cx="50%" cy="50%" outerRadius={100} dataKey="cantidad" nameKey="segmento" label={({ segmento, cantidad }) => `${segmento}: ${cantidad}`}>
                        {clientesPorSegmento.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Clientes por Industria</CardTitle>
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
                  {campanas.map((c, i) => (
                    <TableRow key={c.id ?? i}>
                      <TableCell className="font-medium">{c.nombre}</TableCell>
                      <TableCell><Badge variant="outline">{c.tipoCampana}</Badge></TableCell>
                      <TableCell className="text-right">{fmt(Number(c.presupuestoEstimado ?? 0))}</TableCell>
                      <TableCell className="text-right">{fmt(Number(c.presupuestoGastado ?? 0))}</TableCell>
                      <TableCell className="text-right">{c.leadsGenerados ?? 0}</TableCell>
                      <TableCell className="text-right">{c.oportunidadesGeneradas ?? 0}</TableCell>
                      <TableCell className="text-right font-medium text-green-500">{c.negociosGanados ?? 0}</TableCell>
                    </TableRow>
                  ))}
                  {campanas.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Sin campañas registradas</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actividad" className="space-y-4">
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
          <Card>
            <CardHeader>
              <CardTitle>Detalle de Actividad</CardTitle>
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
                  {interaccionesPorUsuario.map((u, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{u.usuario}</TableCell>
                      <TableCell className="text-right">{u.llamadas}</TableCell>
                      <TableCell className="text-right">{u.emails}</TableCell>
                      <TableCell className="text-right">{u.reuniones}</TableCell>
                      <TableCell className="text-right">{u.visitas}</TableCell>
                      <TableCell className="text-right font-bold">{u.total}</TableCell>
                    </TableRow>
                  ))}
                  {interaccionesPorUsuario.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Sin actividad registrada</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

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
