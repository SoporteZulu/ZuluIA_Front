"use client"

import { useMemo } from "react"
import { Activity, AlertTriangle, BarChart3, Megaphone, Users } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { CrmPageHero, CrmStatCard, crmPanelClassName } from "@/components/crm/crm-page-kit"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCrmReportes } from "@/lib/hooks/useCrm"

const COLORS = ["#38bdf8", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value?: Date | string) {
  if (!value) return "-"
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value))
}

function getRiesgoVariant(score: number): "destructive" | "default" | "secondary" | "outline" {
  if (score >= 4) return "destructive"
  if (score >= 2) return "default"
  return "secondary"
}

export default function ReportesPage() {
  const { reportes, loading, error } = useCrmReportes()

  const pipelineChart = useMemo(
    () =>
      reportes.pipelinePorEtapa.map((item) => ({
        etapa: item.etapa.replaceAll("_", " "),
        cantidad: item.cantidad,
        monto: item.monto,
      })),
    [reportes.pipelinePorEtapa]
  )

  const probabilityChart = useMemo(
    () =>
      reportes.distribucionProbabilidad.map((item) => ({ name: item.rango, value: item.cantidad })),
    [reportes.distribucionProbabilidad]
  )

  const segmentChart = useMemo(
    () => reportes.clientesPorSegmento.map((item) => ({ name: item.nombre, value: item.cantidad })),
    [reportes.clientesPorSegmento]
  )

  const userActivityChart = useMemo(
    () =>
      reportes.actividadPorUsuario
        .slice(0, 6)
        .map((item) => ({ nombre: item.nombre, total: item.total })),
    [reportes.actividadPorUsuario]
  )

  if (loading) {
    return (
      <div className="flex min-h-80 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
        Cargando reportes CRM...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <CrmPageHero
        eyebrow="CRM intelligence"
        title="Reportes CRM"
        description="Analítica consolidada desde backend para pipeline, marketing y actividad comercial con una lectura ejecutiva más clara."
      />

      {error && (
        <Card className="border-red-500/40">
          <CardContent className="pt-6 text-sm text-red-300">{error}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <CrmStatCard
          label="Clientes activos"
          value={reportes.resumenComercial.clientesActivos}
          hint="Base operativa comercial vigente"
          icon={Users}
          tone="slate"
        />
        <CrmStatCard
          label="Pipeline abierto"
          value={formatCurrency(reportes.resumenComercial.pipelineAbierto)}
          hint="Valor consolidado del embudo comercial"
          icon={BarChart3}
          tone="blue"
        />
        <CrmStatCard
          label="Cierres vencidos"
          value={reportes.resumenComercial.cierresVencidos}
          hint="Negocios que ya excedieron la fecha estimada"
          icon={AlertTriangle}
          tone="amber"
        />
        <CrmStatCard
          label="Seguimiento vencido"
          value={reportes.resumenComercial.seguimientoVencido}
          hint="Clientes u oportunidades sin gestión a tiempo"
          icon={Activity}
          tone="rose"
        />
      </div>

      <Tabs defaultValue="comercial" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 rounded-2xl border border-slate-200 bg-slate-50 p-1">
          <TabsTrigger value="comercial">Comercial</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
          <TabsTrigger value="actividad">Actividad</TabsTrigger>
        </TabsList>

        <TabsContent value="comercial" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <Card className={crmPanelClassName}>
              <CardHeader>
                <CardTitle>Pipeline por etapa</CardTitle>
                <CardDescription>Distribución consolidada del embudo comercial.</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipelineChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="etapa" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="cantidad" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className={crmPanelClassName}>
              <CardHeader>
                <CardTitle>Probabilidad</CardTitle>
                <CardDescription>Rangos de cierre sobre oportunidades visibles.</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={probabilityChart}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={110}
                      label
                    >
                      {probabilityChart.map((entry, index) => (
                        <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Card className={crmPanelClassName}>
              <CardHeader>
                <CardTitle>Ranking de vendedores</CardTitle>
                <CardDescription>Resultado y pipeline por responsable.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Responsable</TableHead>
                      <TableHead>Ganadas</TableHead>
                      <TableHead>Activas</TableHead>
                      <TableHead>Monto ganado</TableHead>
                      <TableHead>Pipeline</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportes.rankingVendedores.map((item) => (
                      <TableRow key={item.usuarioId}>
                        <TableCell>{item.nombre}</TableCell>
                        <TableCell>{item.oportunidadesGanadas}</TableCell>
                        <TableCell>{item.oportunidadesActivas}</TableCell>
                        <TableCell>{formatCurrency(item.montoGanado)}</TableCell>
                        <TableCell>{formatCurrency(item.pipeline)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className={crmPanelClassName}>
              <CardHeader>
                <CardTitle>Radar de oportunidades</CardTitle>
                <CardDescription>
                  Oportunidades con mayor nivel de riesgo operativo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {reportes.radarOportunidades.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{item.titulo}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.cliente} · {item.responsable}
                        </p>
                      </div>
                      <Badge variant={getRiesgoVariant(item.riesgo)}>Riesgo {item.riesgo}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>{formatCurrency(item.montoEstimado)}</span>
                      <span>Cierre {formatDate(item.fechaEstimadaCierre)}</span>
                      <span>Última gestión {formatDate(item.ultimaGestion)}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className={crmPanelClassName}>
            <CardHeader>
              <CardTitle>Radar de clientes</CardTitle>
              <CardDescription>Cuentas priorizadas por criticidad comercial.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {reportes.radarClientes.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.nombre}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.segmento} · {item.responsable}
                      </p>
                    </div>
                    <Badge variant={getRiesgoVariant(item.criticidad)}>
                      Criticidad {item.criticidad}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>Pipeline {formatCurrency(item.pipeline)}</span>
                    <span>Estado {item.estadoRelacion.replaceAll("_", " ")}</span>
                    <span>Última gestión {formatDate(item.ultimaGestion)}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="marketing" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <CrmStatCard
              label="Campañas activas"
              value={reportes.resumenMarketing.campanasActivas}
              hint="Frentes vigentes de marketing"
              icon={Megaphone}
              tone="violet"
            />
            <CrmStatCard
              label="Desvío presupuestario"
              value={`${reportes.resumenMarketing.desvioPresupuestario.toFixed(1)}%`}
              hint="Brecha entre presupuesto y gasto real"
              icon={AlertTriangle}
              tone="amber"
            />
            <CrmStatCard
              label="Leads"
              value={reportes.resumenMarketing.leads}
              hint="Nuevos contactos generados por campañas"
              icon={Users}
              tone="blue"
            />
            <CrmStatCard
              label="Conversión"
              value={`${reportes.resumenMarketing.conversion.toFixed(1)}%`}
              hint="Tasa consolidada hacia oportunidad o negocio"
              icon={BarChart3}
              tone="emerald"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Card className={crmPanelClassName}>
              <CardHeader>
                <CardTitle>Clientes por segmento</CardTitle>
                <CardDescription>Composición del padrón CRM segmentado.</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={segmentChart} dataKey="value" nameKey="name" outerRadius={110} label>
                      {segmentChart.map((entry, index) => (
                        <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className={crmPanelClassName}>
              <CardHeader>
                <CardTitle>Resultados de campañas</CardTitle>
                <CardDescription>Impacto de campañas sobre leads y oportunidades.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {reportes.resultadosCampanas.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{item.nombre}</p>
                        <p className="text-sm text-muted-foreground">{item.tipoCampana}</p>
                      </div>
                      <Badge variant="outline">{item.oportunidadesGeneradas} oportunidades</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>Presupuesto {formatCurrency(item.presupuesto)}</span>
                      <span>Gastado {formatCurrency(item.gastado)}</span>
                      <span>Leads {item.leadsGenerados}</span>
                      <span>Ganados {item.negociosGanados}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className={crmPanelClassName}>
            <CardHeader>
              <CardTitle>Radar de campañas</CardTitle>
              <CardDescription>Seguimiento de desvíos y eficacia por campaña.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaña</TableHead>
                    <TableHead>Objetivo</TableHead>
                    <TableHead>Responsable</TableHead>
                    <TableHead>Vigencia</TableHead>
                    <TableHead>Desvío</TableHead>
                    <TableHead>Costo/lead</TableHead>
                    <TableHead>Conversión</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportes.radarCampanas.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.nombre}</TableCell>
                      <TableCell>{item.objetivo.replaceAll("_", " ")}</TableCell>
                      <TableCell>{item.responsable}</TableCell>
                      <TableCell>
                        {formatDate(item.fechaInicio)} - {formatDate(item.fechaFin)}
                      </TableCell>
                      <TableCell>{item.desvio.toFixed(1)}%</TableCell>
                      <TableCell>{formatCurrency(item.costoPorLead)}</TableCell>
                      <TableCell>{item.tasaConversion.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actividad" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Card className={crmPanelClassName}>
              <CardHeader>
                <CardTitle>Actividad por usuario</CardTitle>
                <CardDescription>Volumen total de interacciones registradas.</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={userActivityChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nombre" hide />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total" fill="#22c55e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className={crmPanelClassName}>
              <CardHeader>
                <CardTitle>Desglose por responsable</CardTitle>
                <CardDescription>Llamadas, emails, reuniones y visitas.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Llamadas</TableHead>
                      <TableHead>Emails</TableHead>
                      <TableHead>Reuniones</TableHead>
                      <TableHead>Visitas</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportes.actividadPorUsuario.map((item) => (
                      <TableRow key={item.usuarioId}>
                        <TableCell>{item.nombre}</TableCell>
                        <TableCell>{item.llamadas}</TableCell>
                        <TableCell>{item.emails}</TableCell>
                        <TableCell>{item.reuniones}</TableCell>
                        <TableCell>{item.visitas}</TableCell>
                        <TableCell>{item.total}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <Card className={crmPanelClassName}>
            <CardHeader>
              <CardTitle>Actividad reciente</CardTitle>
              <CardDescription>Últimos eventos comerciales visibles en CRM.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {reportes.actividadReciente.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {item.tipoInteraccion} · {item.cliente}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.usuario} · {item.canal} · {item.resultado}
                      </p>
                    </div>
                    <Badge variant="outline">{formatDate(item.fechaHora)}</Badge>
                  </div>
                  {item.descripcion && (
                    <p className="mt-3 text-sm text-muted-foreground">{item.descripcion}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
