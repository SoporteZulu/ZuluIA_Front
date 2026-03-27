"use client"

import Link from "next/link"

import {
  AlertCircle,
  BarChart3,
  Briefcase,
  CalendarClock,
  CalendarRange,
  ClipboardList,
  HardHat,
  Users,
} from "lucide-react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  useClientesProyectos,
  useMiembros,
  useObras,
  useProyectos,
  useTareasProyecto,
} from "@/lib/hooks/useProyectos"

function SummaryCard({
  title,
  value,
  description,
  icon,
}: {
  title: string
  value: string | number
  description: string
  icon: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  )
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value)
}

export default function ProyectosDashboard() {
  const { proyectos } = useProyectos()
  const { miembros } = useMiembros()
  const { obras } = useObras()
  const { tareas } = useTareasProyecto()
  const { clientes } = useClientesProyectos()

  const today = new Date()

  const activos = proyectos.filter((proyecto) => proyecto.estado === "En Curso")
  const completados = proyectos.filter((proyecto) => proyecto.estado === "Completado")
  const enRiesgo = proyectos.filter(
    (proyecto) => proyecto.estado === "En Riesgo" || proyecto.estado === "Retrasado"
  )
  const proyectosCriticos = proyectos.filter(
    (proyecto) =>
      proyecto.prioridad === "Crítica" ||
      proyecto.estado === "En Riesgo" ||
      proyecto.estado === "Retrasado"
  )
  const disponibilidad = miembros.filter(
    (miembro) => miembro.estado === "Disponible" || miembro.estado === "Online"
  ).length
  const sobrecargados = miembros.filter((miembro) => miembro.tareasAsignadas >= 6)
  const ingresosTotales = clientes.reduce((sum, cliente) => sum + cliente.ingresos, 0)
  const presupuestoActivo = activos.reduce((sum, proyecto) => sum + proyecto.presupuesto, 0)
  const obrasEjecucion = obras.filter((obra) => obra.estado === "En Ejecución")
  const obrasComprometidas = obras.filter(
    (obra) => obra.estado === "Paralizada" || obra.avanceFisico < obra.avanceFinanciero
  )
  const tareasAbiertas = tareas.filter((tarea) => tarea.estado !== "Hecho")
  const tareasVencidas = tareas.filter((tarea) => {
    if (!tarea.fechaVencimiento || tarea.estado === "Hecho") {
      return false
    }

    return new Date(tarea.fechaVencimiento) < today
  })
  const tareasCriticas = tareas.filter(
    (tarea) => tarea.estado !== "Hecho" && tarea.prioridad === "Crítica"
  )
  const clienteDestacado = [...clientes].sort(
    (left, right) => right.ingresos - left.ingresos || right.proyectos - left.proyectos
  )[0]

  const tareasPorProyecto = tareas.reduce<Record<string, number>>((accumulator, tarea) => {
    accumulator[tarea.proyecto] = (accumulator[tarea.proyecto] ?? 0) + 1
    return accumulator
  }, {})

  const tareasVencidasPorProyecto = tareasVencidas.reduce<Record<string, number>>(
    (accumulator, tarea) => {
      accumulator[tarea.proyecto] = (accumulator[tarea.proyecto] ?? 0) + 1
      return accumulator
    },
    {}
  )

  const proyectosOperativos = activos
    .map((proyecto) => {
      const fin = new Date(proyecto.fechaFin)
      const diasRestantes = Math.ceil((fin.getTime() - today.getTime()) / 86400000)
      const equipoAsignado = proyecto.equipo.length
      const obraAsociada = obras.find((obra) => obra.nombre === proyecto.nombre)

      return {
        ...proyecto,
        diasRestantes,
        equipoAsignado,
        obraAsociada,
        tareasAbiertas: tareasPorProyecto[proyecto.nombre] ?? 0,
        tareasVencidas: tareasVencidasPorProyecto[proyecto.nombre] ?? 0,
      }
    })
    .sort((left, right) => {
      if (right.tareasVencidas !== left.tareasVencidas) {
        return right.tareasVencidas - left.tareasVencidas
      }

      if (left.diasRestantes !== right.diasRestantes) {
        return left.diasRestantes - right.diasRestantes
      }

      return right.avance - left.avance
    })

  const dataProgreso = proyectos.map((proyecto) => ({
    nombre: proyecto.nombre.slice(0, 18),
    avance: proyecto.avance,
    presupuesto: Math.round(proyecto.presupuesto / 1000000),
    tareas: tareasPorProyecto[proyecto.nombre] ?? 0,
  }))

  const radarOperativo = [
    {
      title: "Tareas vencidas",
      value: tareasVencidas.length,
      description: `${tareasCriticas.length} críticas todavía abiertas en la cartera`,
      icon: <CalendarClock className="h-4 w-4 text-amber-600" />,
    },
    {
      title: "Obras comprometidas",
      value: obrasComprometidas.length,
      description: `${obrasEjecucion.length} obras siguen activas en ejecución`,
      icon: <HardHat className="h-4 w-4 text-rose-600" />,
    },
    {
      title: "Líderes saturados",
      value: sobrecargados.length,
      description: "Miembros con seis o más tareas asignadas",
      icon: <Users className="h-4 w-4 text-sky-700" />,
    },
    {
      title: "Frentes críticos",
      value: proyectosCriticos.length,
      description: "Proyectos con prioridad crítica o estado comprometido",
      icon: <AlertCircle className="h-4 w-4 text-red-600" />,
    },
  ]

  const accesosRapidos = [
    {
      title: "Lista de proyectos",
      description: "Gestiona la cartera principal, filtros y altas del módulo.",
      href: "/proyectos/lista",
      icon: Briefcase,
      color: "text-sky-700",
    },
    {
      title: "Tareas",
      description: "Revisa backlog, prioridades y entregables abiertos.",
      href: "/proyectos/tareas",
      icon: ClipboardList,
      color: "text-amber-700",
    },
    {
      title: "Equipo",
      description: "Monitorea disponibilidad, carga y asignaciones del equipo.",
      href: "/proyectos/equipo",
      icon: Users,
      color: "text-emerald-700",
    },
    {
      title: "Obras",
      description: "Sigue entidades, frentes de obra y desvíos visibles.",
      href: "/proyectos/obras",
      icon: HardHat,
      color: "text-rose-700",
    },
    {
      title: "Presupuestos",
      description: "Cruza presupuesto, avance y cobertura legacy visible.",
      href: "/proyectos/presupuestos",
      icon: CalendarRange,
      color: "text-violet-700",
    },
    {
      title: "Tiempo",
      description: "Consola de seguimiento sobre horas y esfuerzo registrado.",
      href: "/proyectos/tiempo",
      icon: CalendarClock,
      color: "text-cyan-700",
    },
    {
      title: "Analíticas",
      description: "Explora capacidad, riesgo y desempeño de la cartera.",
      href: "/proyectos/analiticas",
      icon: BarChart3,
      color: "text-orange-700",
    },
  ]

  return (
    <div className="flex-1 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard de proyectos</h1>
        <p className="text-muted-foreground mt-1">
          Vista consolidada de cartera, capacidad operativa y exposición presupuestaria del módulo.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          title="Proyectos activos"
          value={activos.length}
          description="Iniciados y actualmente en ejecución"
          icon={<Briefcase className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Completados"
          value={completados.length}
          description="Cerrados en la cartera registrada"
          icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Con riesgo"
          value={enRiesgo.length}
          description={`${tareasVencidas.length} tareas vencidas impactan la ejecución`}
          icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Equipo disponible"
          value={`${disponibilidad}/${miembros.length}`}
          description="Miembros online o disponibles para asignación"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Presupuesto activo"
          value={formatMoney(presupuestoActivo)}
          description={`Ingresos de clientes cargados: ${formatMoney(ingresosTotales)}`}
          icon={<CalendarRange className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {radarOperativo.map((item) => (
          <Card key={item.title}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                {item.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{item.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {accesosRapidos.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="h-full cursor-pointer transition-colors hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className={`rounded-lg bg-muted p-2 ${item.color}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <CardDescription className="text-xs">{item.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progreso y presupuesto</CardTitle>
            <CardDescription>
              Avance porcentual, presupuesto y volumen de tareas por proyecto visible en la cartera.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dataProgreso}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombre" angle={-35} textAnchor="end" height={70} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="avance" fill="#1d4ed8" name="Avance %" />
                <Bar dataKey="presupuesto" fill="#0f766e" name="Presupuesto (M ARS)" />
                <Bar dataKey="tareas" fill="#b45309" name="Tareas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cobertura comercial</CardTitle>
            <CardDescription>
              Relación entre clientes, cartera activa y exposición económica declarada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {clienteDestacado ? (
                <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-sky-950">Cliente destacado</p>
                      <h3 className="mt-1 text-lg font-semibold">{clienteDestacado.nombre}</h3>
                      <p className="text-sm text-sky-900/80">{clienteDestacado.sector}</p>
                    </div>
                    <Badge variant="secondary">{clienteDestacado.estado}</Badge>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-sky-900/70">Ingresos</p>
                      <p className="text-sm font-medium text-sky-950">
                        {formatMoney(clienteDestacado.ingresos)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-sky-900/70">Proyectos</p>
                      <p className="text-sm font-medium text-sky-950">
                        {clienteDestacado.proyectos} frentes registrados
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="space-y-3">
                {clientes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No hay clientes cargados para el módulo.
                  </p>
                ) : (
                  clientes.slice(0, 4).map((cliente) => (
                    <div
                      key={cliente.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{cliente.nombre}</p>
                        <p className="text-xs text-muted-foreground">{cliente.sector}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">{cliente.proyectos} proyectos</Badge>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatMoney(cliente.ingresos)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Seguimiento de frentes activos</CardTitle>
            <CardDescription>
              Prioriza vencimientos, carga operativa y vínculo con obra para los proyectos en curso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {proyectosOperativos.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay proyectos activos en este momento.
                </p>
              ) : (
                proyectosOperativos.map((proyecto) => (
                  <div key={proyecto.id} className="rounded-lg border p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{proyecto.nombre}</h3>
                        <p className="text-sm text-muted-foreground">{proyecto.cliente}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{proyecto.prioridad}</Badge>
                        <Badge>{proyecto.estado}</Badge>
                        {proyecto.tareasVencidas > 0 ? (
                          <Badge variant="destructive">{proyecto.tareasVencidas} vencidas</Badge>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid gap-3 text-sm md:grid-cols-5">
                      <div>
                        <span className="text-muted-foreground">Fin previsto</span>
                        <p className="font-medium">
                          {new Date(proyecto.fechaFin).toLocaleDateString("es-AR")}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Días restantes</span>
                        <p className="font-medium">{proyecto.diasRestantes}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Equipo</span>
                        <p className="font-medium">{proyecto.equipoAsignado} recursos</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tareas abiertas</span>
                        <p className="font-medium">{proyecto.tareasAbiertas}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Obra asociada</span>
                        <p className="font-medium">
                          {proyecto.obraAsociada
                            ? proyecto.obraAsociada.estado
                            : "Sin obra vinculada"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-3 text-xs">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-linear-to-r from-sky-600 to-teal-600"
                          style={{ width: `${proyecto.avance}%` }}
                        />
                      </div>
                      <span className="font-medium">{proyecto.avance}%</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Carga de coordinación</CardTitle>
              <CardDescription>
                Seguimiento de capacidad del equipo y tensión operativa visible hoy.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Tareas abiertas
                </p>
                <p className="mt-1 text-2xl font-semibold">{tareasAbiertas.length}</p>
                <p className="text-xs text-muted-foreground">
                  {tareasCriticas.length} críticas y {tareasVencidas.length} fuera de término.
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Miembros disponibles
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {disponibilidad}/{miembros.length}
                </p>
                <p className="text-xs text-muted-foreground">
                  {sobrecargados.length} perfiles están con saturación visible.
                </p>
              </div>
              <div className="space-y-2">
                {miembros.slice(0, 4).map((miembro) => (
                  <div
                    key={miembro.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{miembro.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {miembro.rol} · {miembro.departamento}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{miembro.estado}</Badge>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {miembro.tareasAsignadas} tareas
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Obras y desvíos</CardTitle>
              <CardDescription>
                Resume frentes con más exposición entre ejecución física y financiera.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {obrasComprometidas.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay obras comprometidas con la información actual.
                </p>
              ) : (
                obrasComprometidas.slice(0, 4).map((obra) => (
                  <div key={obra.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{obra.nombre}</p>
                        <p className="text-xs text-muted-foreground">{obra.entidadEjecutora}</p>
                      </div>
                      <Badge variant={obra.estado === "Paralizada" ? "destructive" : "outline"}>
                        {obra.estado}
                      </Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                      <div>
                        <p>Avance físico</p>
                        <p className="font-medium text-foreground">{obra.avanceFisico}%</p>
                      </div>
                      <div>
                        <p>Avance financiero</p>
                        <p className="font-medium text-foreground">{obra.avanceFinanciero}%</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
