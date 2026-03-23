"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  useCrmClientes,
  useCrmOportunidades,
  useCrmInteracciones,
  useCrmCampanas,
  useCrmUsuarios,
} from "@/lib/hooks/useCrm"
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
  Legend,
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
const fmt = (v: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(v)

const fmtDate = (value?: Date | string | null) => {
  if (!value) return "Sin fecha"
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value))
}

const getStageLabel = (etapa: string) =>
  ({
    lead: "Lead",
    calificado: "Calificado",
    propuesta: "Propuesta",
    negociacion: "Negociacion",
    cerrado_ganado: "Ganado",
    cerrado_perdido: "Perdido",
  })[etapa] ?? etapa

const getOriginLabel = (origen: string) =>
  ({
    campana: "Campana",
    referido: "Referido",
    web: "Web",
    llamada: "Llamada",
    evento: "Evento",
    otro: "Otro",
  })[origen] ?? origen

const getCampaignGoalLabel = (objetivo: string) =>
  ({
    generacion_leads: "Generacion de leads",
    upselling: "Upselling",
    fidelizacion: "Fidelizacion",
    recuperacion: "Recuperacion",
    branding: "Branding",
  })[objetivo] ?? objetivo

const getInteractionResultLabel = (resultado: string) =>
  ({
    exitosa: "Exitosa",
    sin_respuesta: "Sin respuesta",
    reprogramada: "Reprogramada",
    cancelada: "Cancelada",
  })[resultado] ?? resultado

const getDaysUntil = (value?: Date | string | null) => {
  if (!value) return null
  const currentDate = new Date()
  currentDate.setHours(0, 0, 0, 0)
  const targetDate = new Date(value)
  targetDate.setHours(0, 0, 0, 0)
  return Math.round((targetDate.getTime() - currentDate.getTime()) / 86400000)
}

export default function ReportesPage() {
  const { clientes } = useCrmClientes()
  const { oportunidades } = useCrmOportunidades()
  const { interacciones } = useCrmInteracciones()
  const { campanas } = useCrmCampanas()
  const { usuarios } = useCrmUsuarios()

  const clientesById = useMemo(
    () => new Map(clientes.map((cliente) => [cliente.id, cliente])),
    [clientes]
  )

  const usuariosById = useMemo(
    () => new Map(usuarios.map((usuario) => [usuario.id, usuario])),
    [usuarios]
  )

  const lastInteractionByCliente = useMemo(() => {
    const map = new Map<string, Date>()
    interacciones.forEach((interaccion) => {
      const currentDate = new Date(interaccion.fechaHora)
      const previousDate = map.get(interaccion.clienteId)
      if (!previousDate || currentDate > previousDate) {
        map.set(interaccion.clienteId, currentDate)
      }
    })
    return map
  }, [interacciones])

  const lastInteractionByOportunidad = useMemo(() => {
    const map = new Map<string, Date>()
    interacciones.forEach((interaccion) => {
      if (!interaccion.oportunidadId) return
      const currentDate = new Date(interaccion.fechaHora)
      const previousDate = map.get(interaccion.oportunidadId)
      if (!previousDate || currentDate > previousDate) {
        map.set(interaccion.oportunidadId, currentDate)
      }
    })
    return map
  }, [interacciones])

  const resumenComercial = useMemo(() => {
    const oportunidadesActivas = oportunidades.filter(
      (o) => !["cerrado_ganado", "cerrado_perdido"].includes(o.etapa)
    )
    const pipelineAbierto = oportunidadesActivas.reduce(
      (acc, oportunidad) => acc + Number(oportunidad.montoEstimado ?? 0),
      0
    )
    const cierresVencidos = oportunidadesActivas.filter((oportunidad) => {
      const daysUntil = getDaysUntil(oportunidad.fechaEstimadaCierre)
      return daysUntil !== null && daysUntil < 0
    }).length
    const seguimientoVencido = clientes.filter((cliente) => {
      if (cliente.estadoRelacion === "en_riesgo") return true
      const lastInteraction = lastInteractionByCliente.get(cliente.id)
      if (!lastInteraction) return true
      return getDaysUntil(lastInteraction) !== null && getDaysUntil(lastInteraction)! < -30
    }).length
    return {
      clientesActivos: clientes.filter((cliente) => cliente.tipoCliente === "activo").length,
      pipelineAbierto,
      cierresVencidos,
      seguimientoVencido,
    }
  }, [clientes, lastInteractionByCliente, oportunidades])

  const oportunidadesPorEtapa = useMemo(
    () =>
      ["lead", "calificado", "propuesta", "negociacion", "cerrado_ganado", "cerrado_perdido"].map(
        (etapa) => ({
          etapa: etapa.replace("cerrado_", "").replace("_", " "),
          cantidad: oportunidades.filter((o) => o.etapa === etapa).length,
          monto: oportunidades
            .filter((o) => o.etapa === etapa)
            .reduce((s, o) => s + Number(o.montoEstimado ?? 0), 0),
        })
      ),
    [oportunidades]
  )

  const vendedoresStats = useMemo(
    () =>
      usuarios
        .filter((u) => u.rol === "comercial" || u.rol === "administrador")
        .map((user) => {
          const ganadas = oportunidades.filter(
            (o) => o.responsableId === user.id && o.etapa === "cerrado_ganado"
          )
          const activas = oportunidades.filter(
            (o) =>
              o.responsableId === user.id &&
              !["cerrado_ganado", "cerrado_perdido"].includes(o.etapa)
          )
          return {
            id: user.id,
            nombre: `${user.nombre} ${user.apellido}`,
            oportunidadesGanadas: ganadas.length,
            montoGanado: ganadas.reduce((s, o) => s + Number(o.montoEstimado ?? 0), 0),
            oportunidadesActivas: activas.length,
            pipeline: activas.reduce((s, o) => s + Number(o.montoEstimado ?? 0), 0),
          }
        })
        .sort((a, b) => b.montoGanado - a.montoGanado),
    [usuarios, oportunidades]
  )

  const clientesPorSegmento = useMemo(() => {
    const map = new Map<string, number>()
    clientes.forEach((c) => {
      if (c.segmento) map.set(c.segmento, (map.get(c.segmento) ?? 0) + 1)
    })
    return Array.from(map.entries()).map(([segmento, cantidad]) => ({ segmento, cantidad }))
  }, [clientes])

  const clientesPorIndustria = useMemo(() => {
    const map = new Map<string, number>()
    clientes.forEach((c) => {
      if (c.industria) map.set(c.industria, (map.get(c.industria) ?? 0) + 1)
    })
    return Array.from(map.entries())
      .map(([industria, cantidad]) => ({ industria, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
  }, [clientes])

  const interaccionesPorUsuario = useMemo(
    () =>
      usuarios
        .map((user) => {
          const ui = interacciones.filter((i) => i.usuarioResponsableId === user.id)
          return {
            usuario: `${user.nombre} ${user.apellido}`,
            llamadas: ui.filter((i) => i.tipoInteraccion === "llamada").length,
            emails: ui.filter((i) => i.tipoInteraccion === "email").length,
            reuniones: ui.filter((i) => i.tipoInteraccion === "reunion").length,
            visitas: ui.filter((i) => i.tipoInteraccion === "visita").length,
            total: ui.length,
          }
        })
        .filter((u) => u.total > 0),
    [usuarios, interacciones]
  )

  const probabilidadData = useMemo(
    () => [
      { name: "0-25%", value: oportunidades.filter((o) => o.probabilidad <= 25).length },
      {
        name: "26-50%",
        value: oportunidades.filter((o) => o.probabilidad > 25 && o.probabilidad <= 50).length,
      },
      {
        name: "51-75%",
        value: oportunidades.filter((o) => o.probabilidad > 50 && o.probabilidad <= 75).length,
      },
      { name: "76-100%", value: oportunidades.filter((o) => o.probabilidad > 75).length },
    ],
    [oportunidades]
  )

  const oportunidadesCriticas = useMemo(
    () =>
      oportunidades
        .filter((oportunidad) => !["cerrado_ganado", "cerrado_perdido"].includes(oportunidad.etapa))
        .map((oportunidad) => {
          const cliente = clientesById.get(oportunidad.clienteId)
          const responsable = oportunidad.responsableId
            ? usuariosById.get(oportunidad.responsableId)
            : undefined
          const ultimoSeguimiento = lastInteractionByOportunidad.get(oportunidad.id)
          const daysToClose = getDaysUntil(oportunidad.fechaEstimadaCierre)
          const daysSinceTracking = ultimoSeguimiento ? getDaysUntil(ultimoSeguimiento) : null
          const riesgo =
            (daysToClose !== null && daysToClose < 0 ? 3 : 0) +
            (daysSinceTracking !== null && daysSinceTracking < -14 ? 2 : 0) +
            (oportunidad.probabilidad <= 40 ? 1 : 0) +
            (Number(oportunidad.montoEstimado ?? 0) >= 10000 ? 1 : 0)

          return {
            id: oportunidad.id,
            titulo: oportunidad.titulo,
            etapa: getStageLabel(oportunidad.etapa),
            cliente: cliente?.nombre ?? "Cliente no disponible",
            responsable: responsable
              ? `${responsable.nombre} ${responsable.apellido}`
              : "Sin asignar",
            monto: Number(oportunidad.montoEstimado ?? 0),
            origen: getOriginLabel(oportunidad.origen),
            cierre: oportunidad.fechaEstimadaCierre,
            daysToClose,
            ultimoSeguimiento,
            riesgo,
          }
        })
        .sort((a, b) => b.riesgo - a.riesgo || b.monto - a.monto)
        .slice(0, 8),
    [clientesById, lastInteractionByOportunidad, oportunidades, usuariosById]
  )

  const clientesRadar = useMemo(
    () =>
      clientes
        .map((cliente) => {
          const responsable = cliente.responsableId
            ? usuariosById.get(cliente.responsableId)
            : undefined
          const lastInteraction = lastInteractionByCliente.get(cliente.id)
          const oportunidadesCliente = oportunidades.filter(
            (oportunidad) => oportunidad.clienteId === cliente.id
          )
          const pipeline = oportunidadesCliente
            .filter(
              (oportunidad) => !["cerrado_ganado", "cerrado_perdido"].includes(oportunidad.etapa)
            )
            .reduce((acc, oportunidad) => acc + Number(oportunidad.montoEstimado ?? 0), 0)
          const sinGestion = lastInteraction ? getDaysUntil(lastInteraction) : null
          const criticidad =
            (cliente.estadoRelacion === "en_riesgo" ? 3 : 0) +
            (sinGestion !== null && sinGestion < -30 ? 2 : 0) +
            (pipeline > 0 ? 1 : 0)

          return {
            id: cliente.id,
            nombre: cliente.nombre,
            segmento: cliente.segmento,
            relacion: cliente.estadoRelacion,
            origen: getOriginLabel(cliente.origenCliente),
            responsable: responsable
              ? `${responsable.nombre} ${responsable.apellido}`
              : "Sin asignar",
            ultimaGestion: lastInteraction,
            pipeline,
            criticidad,
          }
        })
        .filter((cliente) => cliente.criticidad > 0)
        .sort((a, b) => b.criticidad - a.criticidad || b.pipeline - a.pipeline)
        .slice(0, 8),
    [clientes, lastInteractionByCliente, oportunidades, usuariosById]
  )

  const resumenMarketing = useMemo(() => {
    const campanasActivas = campanas.filter((campana) => {
      const startDate = new Date(campana.fechaInicio)
      const endDate = campana.fechaFin ? new Date(campana.fechaFin) : null
      const today = new Date()
      return startDate <= today && (!endDate || endDate >= today)
    })
    const presupuesto = campanas.reduce(
      (acc, campana) => acc + Number(campana.presupuestoEstimado ?? 0),
      0
    )
    const gastado = campanas.reduce(
      (acc, campana) => acc + Number(campana.presupuestoGastado ?? 0),
      0
    )
    const leads = campanas.reduce((acc, campana) => acc + Number(campana.leadsGenerados ?? 0), 0)
    const negocios = campanas.reduce(
      (acc, campana) => acc + Number(campana.negociosGanados ?? 0),
      0
    )
    return {
      campanasActivas: campanasActivas.length,
      desvioPresupuestario: gastado - presupuesto,
      leads,
      conversion: leads > 0 ? (negocios / leads) * 100 : 0,
    }
  }, [campanas])

  const campanasRadar = useMemo(
    () =>
      campanas
        .map((campana) => {
          const responsable = campana.responsableId
            ? usuariosById.get(campana.responsableId)
            : undefined
          const presupuesto = Number(campana.presupuestoEstimado ?? 0)
          const gastado = Number(campana.presupuestoGastado ?? 0)
          const leads = Number(campana.leadsGenerados ?? 0)
          const oportunidadesGeneradas = Number(campana.oportunidadesGeneradas ?? 0)
          const negocios = Number(campana.negociosGanados ?? 0)
          const costoPorLead = leads > 0 ? gastado / leads : 0
          const tasaConversion = leads > 0 ? (negocios / leads) * 100 : 0
          return {
            id: campana.id,
            nombre: campana.nombre,
            objetivo: getCampaignGoalLabel(campana.objetivo),
            responsable: responsable
              ? `${responsable.nombre} ${responsable.apellido}`
              : "Sin asignar",
            vigencia: `${fmtDate(campana.fechaInicio)} - ${fmtDate(campana.fechaFin)}`,
            presupuesto,
            gastado,
            desvio: gastado - presupuesto,
            costoPorLead,
            oportunidadesGeneradas,
            tasaConversion,
          }
        })
        .sort((a, b) => Math.abs(b.desvio) - Math.abs(a.desvio) || b.costoPorLead - a.costoPorLead)
        .slice(0, 8),
    [campanas, usuariosById]
  )

  const actividadReciente = useMemo(
    () =>
      [...interacciones]
        .sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime())
        .slice(0, 10)
        .map((interaccion) => {
          const cliente = clientesById.get(interaccion.clienteId)
          const usuario = usuariosById.get(interaccion.usuarioResponsableId)
          return {
            id: interaccion.id,
            fechaHora: interaccion.fechaHora,
            tipo: interaccion.tipoInteraccion,
            canal: interaccion.canal,
            resultado: getInteractionResultLabel(interaccion.resultado),
            cliente: cliente?.nombre ?? "Cliente no disponible",
            usuario: usuario ? `${usuario.nombre} ${usuario.apellido}` : "Sin asignar",
            descripcion: interaccion.descripcion,
          }
        }),
    [clientesById, interacciones, usuariosById]
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reportes CRM</h1>
        <p className="text-muted-foreground">Análisis y métricas del negocio</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Cartera activa</CardDescription>
            <CardTitle className="text-3xl">{resumenComercial.clientesActivos}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Clientes con relacion comercial activa para seguimiento diario.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pipeline abierto</CardDescription>
            <CardTitle className="text-3xl">{fmt(resumenComercial.pipelineAbierto)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Monto estimado aun no cerrado en las etapas comerciales vigentes.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Cierres vencidos</CardDescription>
            <CardTitle className="text-3xl">{resumenComercial.cierresVencidos}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Oportunidades con fecha estimada ya vencida y circuito comercial pendiente.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Seguimiento vencido</CardDescription>
            <CardTitle className="text-3xl">{resumenComercial.seguimientoVencido}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Clientes sin gestion reciente o marcados en riesgo comercial.
          </CardContent>
        </Card>
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
                <div className="h-75">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={oportunidadesPorEtapa}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="etapa" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                        }}
                      />
                      <Legend />
                      <Bar
                        yAxisId="left"
                        dataKey="cantidad"
                        fill="#3b82f6"
                        name="Cantidad"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        yAxisId="right"
                        dataKey="monto"
                        fill="#10b981"
                        name="Monto (USD)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Distribución por Probabilidad</CardTitle>
                <CardDescription>
                  Oportunidades agrupadas por probabilidad de cierre
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-75">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={probabilidadData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {COLORS.map((color, i) => (
                          <Cell key={i} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                        }}
                      />
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
                      <TableCell className="text-right font-medium text-green-500">
                        {fmt(v.montoGanado)}
                      </TableCell>
                      <TableCell className="text-right">{v.oportunidadesActivas}</TableCell>
                      <TableCell className="text-right">{fmt(v.pipeline)}</TableCell>
                    </TableRow>
                  ))}
                  {vendedoresStats.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Sin datos disponibles
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Radar de Oportunidades</CardTitle>
              <CardDescription>
                Seguimiento de cierres comprometidos, origen y ultima gestion registrada.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Oportunidad</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Responsable</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>Cierre</TableHead>
                    <TableHead>Ult. gestion</TableHead>
                    <TableHead>Circuito</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {oportunidadesCriticas.map((oportunidad) => (
                    <TableRow key={oportunidad.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{oportunidad.titulo}</div>
                          <div className="text-xs text-muted-foreground">
                            {oportunidad.etapa} · {oportunidad.origen}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{oportunidad.cliente}</TableCell>
                      <TableCell>{oportunidad.responsable}</TableCell>
                      <TableCell className="text-right font-medium">
                        {fmt(oportunidad.monto)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div>{fmtDate(oportunidad.cierre)}</div>
                          <div className="text-xs text-muted-foreground">
                            {oportunidad.daysToClose === null
                              ? "Sin compromiso"
                              : oportunidad.daysToClose < 0
                                ? `${Math.abs(oportunidad.daysToClose)} dias vencida`
                                : `${oportunidad.daysToClose} dias restantes`}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div>{fmtDate(oportunidad.ultimoSeguimiento)}</div>
                          <div className="text-xs text-muted-foreground">
                            {oportunidad.ultimoSeguimiento
                              ? "Gestion registrada"
                              : "Sin actividad vinculada"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={oportunidad.riesgo >= 4 ? "destructive" : "outline"}>
                          {oportunidad.riesgo >= 4 ? "Critico" : "En seguimiento"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {oportunidadesCriticas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        Sin oportunidades activas para seguimiento.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Radar de Clientes</CardTitle>
              <CardDescription>
                Segmento, relacion, origen y pipeline pendiente por cliente priorizado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Responsable</TableHead>
                    <TableHead>Segmento</TableHead>
                    <TableHead>Ult. gestion</TableHead>
                    <TableHead className="text-right">Pipeline</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientesRadar.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{cliente.nombre}</div>
                          <div className="text-xs text-muted-foreground">
                            {cliente.origen} · {cliente.relacion.replaceAll("_", " ")}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{cliente.responsable}</TableCell>
                      <TableCell className="capitalize">{cliente.segmento}</TableCell>
                      <TableCell>{fmtDate(cliente.ultimaGestion)}</TableCell>
                      <TableCell className="text-right">{fmt(cliente.pipeline)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={cliente.criticidad >= 4 ? "destructive" : "secondary"}
                          className="capitalize"
                        >
                          {cliente.criticidad >= 4 ? "Prioritario" : "Controlado"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {clientesRadar.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Sin clientes en radar comercial.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="marketing" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Campañas activas</CardDescription>
                <CardTitle className="text-3xl">{resumenMarketing.campanasActivas}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Acciones vigentes en curso segun su ventana comercial.
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Desvio presupuestario</CardDescription>
                <CardTitle className="text-3xl">
                  {fmt(resumenMarketing.desvioPresupuestario)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Diferencia acumulada entre presupuesto estimado y gasto real.
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Leads generados</CardDescription>
                <CardTitle className="text-3xl">{resumenMarketing.leads}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Volumen captado por campañas con datos reales del CRM.
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Conversion a negocio</CardDescription>
                <CardTitle className="text-3xl">
                  {resumenMarketing.conversion.toFixed(1)}%
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Relacion entre leads obtenidos y negocios ganados registrados.
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Clientes por Segmento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-75">
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
                        {clientesPorSegmento.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                        }}
                      />
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
                <div className="h-75">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={clientesPorIndustria} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                      <YAxis
                        dataKey="industria"
                        type="category"
                        stroke="hsl(var(--muted-foreground))"
                        width={100}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                        }}
                      />
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
                      <TableCell>
                        <Badge variant="outline">{c.tipoCampana}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {fmt(Number(c.presupuestoEstimado ?? 0))}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmt(Number(c.presupuestoGastado ?? 0))}
                      </TableCell>
                      <TableCell className="text-right">{c.leadsGenerados ?? 0}</TableCell>
                      <TableCell className="text-right">{c.oportunidadesGeneradas ?? 0}</TableCell>
                      <TableCell className="text-right font-medium text-green-500">
                        {c.negociosGanados ?? 0}
                      </TableCell>
                    </TableRow>
                  ))}
                  {campanas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        Sin campañas registradas
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Radar de Campañas</CardTitle>
              <CardDescription>
                Objetivo, responsable, vigencia y eficiencia presupuestaria por campaña.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaña</TableHead>
                    <TableHead>Responsable</TableHead>
                    <TableHead>Vigencia</TableHead>
                    <TableHead className="text-right">Desvio</TableHead>
                    <TableHead className="text-right">Costo / lead</TableHead>
                    <TableHead className="text-right">Conversion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campanasRadar.map((campana) => (
                    <TableRow key={campana.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{campana.nombre}</div>
                          <div className="text-xs text-muted-foreground">{campana.objetivo}</div>
                        </div>
                      </TableCell>
                      <TableCell>{campana.responsable}</TableCell>
                      <TableCell>{campana.vigencia}</TableCell>
                      <TableCell className="text-right">
                        <span
                          className={campana.desvio > 0 ? "text-amber-600" : "text-emerald-600"}
                        >
                          {fmt(campana.desvio)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{fmt(campana.costoPorLead)}</TableCell>
                      <TableCell className="text-right">
                        {campana.tasaConversion.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                  {campanasRadar.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Sin campañas para analizar.
                      </TableCell>
                    </TableRow>
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
              <CardDescription>
                Interacciones registradas por cada miembro del equipo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-75">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={interaccionesPorUsuario}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="usuario" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                      }}
                    />
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
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Sin actividad registrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bitacora de Actividad Reciente</CardTitle>
              <CardDescription>
                Ultimos contactos con cliente, canal utilizado y resultado informado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Resultado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actividadReciente.map((interaccion) => (
                    <TableRow key={interaccion.id}>
                      <TableCell>{fmtDate(interaccion.fechaHora)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{interaccion.cliente}</div>
                          <div className="line-clamp-1 text-xs text-muted-foreground">
                            {interaccion.descripcion || "Sin observaciones"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{interaccion.usuario}</TableCell>
                      <TableCell className="capitalize">{interaccion.tipo}</TableCell>
                      <TableCell className="capitalize">{interaccion.canal}</TableCell>
                      <TableCell>
                        <Badge
                          variant={interaccion.resultado === "Exitosa" ? "default" : "outline"}
                        >
                          {interaccion.resultado}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {actividadReciente.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Sin actividad reciente registrada.
                      </TableCell>
                    </TableRow>
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
