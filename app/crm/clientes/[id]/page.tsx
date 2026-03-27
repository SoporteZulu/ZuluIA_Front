"use client"

import Link from "next/link"
import { useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock3,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  Target,
  Users,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import {
  useCrmClientes,
  useCrmContactos,
  useCrmInteracciones,
  useCrmOportunidades,
  useCrmTareas,
  useCrmUsuarios,
} from "@/lib/hooks/useCrm"

function formatDate(value?: Date) {
  if (!value) return "-"
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value))
}

function formatDateTime(value?: Date) {
  if (!value) return "-"
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function formatMoney(value: number, currency: "ARS" | "USD" | "EUR" | "MXN") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPipelineByCurrency(
  pipelineByCurrency: Partial<Record<"ARS" | "USD" | "EUR" | "MXN", number>>
) {
  const currencies: Array<"ARS" | "USD" | "EUR" | "MXN"> = ["ARS", "USD", "EUR", "MXN"]
  const visible = currencies.filter((currency) => Number(pipelineByCurrency[currency] ?? 0) > 0)

  if (visible.length === 0) {
    return "Sin pipeline visible"
  }

  return visible
    .map((currency) => formatMoney(Number(pipelineByCurrency[currency] ?? 0), currency))
    .join(" · ")
}

function getTipoBadgeVariant(tipo: string) {
  if (tipo === "activo") return "secondary"
  if (tipo === "perdido") return "destructive"
  return "outline"
}

function getEstadoRelacionBadgeVariant(estado: string) {
  if (estado === "fidelizado") return "secondary"
  if (estado === "en_riesgo") return "destructive"
  return "outline"
}

function getTaskStateLabel(taskState: string) {
  const labels: Record<string, string> = {
    pendiente: "Pendiente",
    en_curso: "En curso",
    completada: "Completada",
    vencida: "Vencida",
  }
  return labels[taskState] ?? taskState
}

function getInteractionLabel(type: string) {
  const labels: Record<string, string> = {
    llamada: "Llamada",
    email: "Email",
    reunion: "Reunión",
    visita: "Visita",
    ticket: "Ticket",
    mensaje: "Mensaje",
  }
  return labels[type] ?? type
}

export default function ClienteDetallePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [todayTimestamp] = useState(() => Date.now())

  const { clientes, loading: loadingCliente, error: errorCliente } = useCrmClientes()
  const { contactos, loading: loadingContactos, error: errorContactos } = useCrmContactos(id)
  const {
    oportunidades,
    loading: loadingOportunidades,
    error: errorOportunidades,
  } = useCrmOportunidades(id)
  const {
    interacciones,
    loading: loadingInteracciones,
    error: errorInteracciones,
  } = useCrmInteracciones(id)
  const { tareas, loading: loadingTareas, error: errorTareas } = useCrmTareas(id)
  const { usuarios } = useCrmUsuarios()

  const client = clientes.find((current) => current.id === id)
  const responsable = client?.responsableId
    ? usuarios.find((usuario) => usuario.id === client.responsableId)
    : null

  const loading =
    loadingCliente ||
    loadingContactos ||
    loadingOportunidades ||
    loadingInteracciones ||
    loadingTareas

  const combinedError =
    errorCliente || errorContactos || errorOportunidades || errorInteracciones || errorTareas

  const pipelineByCurrency = useMemo(() => {
    return oportunidades.reduce<Partial<Record<"ARS" | "USD" | "EUR" | "MXN", number>>>(
      (accumulator, oportunidad) => {
        if (!["cerrado_ganado", "cerrado_perdido"].includes(oportunidad.etapa)) {
          accumulator[oportunidad.moneda] =
            Number(accumulator[oportunidad.moneda] ?? 0) + Number(oportunidad.montoEstimado ?? 0)
        }
        return accumulator
      },
      {}
    )
  }, [oportunidades])

  const lastInteraction = useMemo(() => {
    return [...interacciones].sort(
      (left, right) => new Date(right.fechaHora).getTime() - new Date(left.fechaHora).getTime()
    )[0]
  }, [interacciones])

  const openTasks = useMemo(() => {
    return tareas.filter((task) => task.estado !== "completada")
  }, [tareas])

  const overdueTasks = useMemo(() => {
    return tareas.filter((task) => {
      if (task.estado === "completada") return false
      return new Date(task.fechaVencimiento).getTime() < todayTimestamp || task.estado === "vencida"
    })
  }, [tareas, todayTimestamp])

  const activeContacts = useMemo(() => {
    return contactos.filter((contact) => contact.estadoContacto === "activo")
  }, [contactos])

  const opportunitySummary = useMemo(() => {
    const abiertas = oportunidades.filter(
      (oportunidad) => !["cerrado_ganado", "cerrado_perdido"].includes(oportunidad.etapa)
    )
    const cierresProximos = abiertas.filter((oportunidad) => {
      if (!oportunidad.fechaEstimadaCierre) return false
      const daysToClose =
        (new Date(oportunidad.fechaEstimadaCierre).getTime() - todayTimestamp) / 86400000
      return daysToClose >= 0 && daysToClose <= 30
    })
    return { abiertas, cierresProximos }
  }, [oportunidades, todayTimestamp])

  const highlightedOpportunity = opportunitySummary.abiertas.sort(
    (left, right) =>
      right.probabilidad - left.probabilidad || right.montoEstimado - left.montoEstimado
  )[0]

  const highlightedContact = activeContacts[0] ?? contactos[0] ?? null

  if (loading && !client) {
    return <div className="p-8 text-center text-muted-foreground">Cargando cliente...</div>
  }

  if (!client) {
    return <div className="p-8 text-center text-muted-foreground">Cliente no encontrado</div>
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{client.nombre}</h1>
              <Badge variant={getTipoBadgeVariant(client.tipoCliente)}>{client.tipoCliente}</Badge>
              <Badge variant={getEstadoRelacionBadgeVariant(client.estadoRelacion)}>
                {client.estadoRelacion.replace("_", " ")}
              </Badge>
            </div>
            <p className="mt-1 text-muted-foreground">
              {client.segmento} · {client.industria ?? "Industria no informada"} · alta{" "}
              {formatDate(client.fechaAlta)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={`/crm/interacciones?action=new&clienteId=${id}`}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Nueva interacción
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/crm/oportunidades?action=new&clienteId=${id}`}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva oportunidad
            </Link>
          </Button>
        </div>
      </div>

      {combinedError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Cliente CRM</AlertTitle>
          <AlertDescription>{combinedError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Contactos activos</p>
            <p className="mt-2 text-2xl font-bold">{activeContacts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Oportunidades abiertas</p>
            <p className="mt-2 text-2xl font-bold">{opportunitySummary.abiertas.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Tareas abiertas</p>
            <p className="mt-2 text-2xl font-bold">{openTasks.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Tareas vencidas</p>
            <p className="mt-2 text-2xl font-bold text-red-600">{overdueTasks.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Última gestión</p>
            <p className="mt-2 text-sm font-semibold">
              {formatDateTime(lastInteraction?.fechaHora)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Ficha operativa</CardTitle>
            <CardDescription>
              Resumen comercial, cobertura de contacto y referencia del responsable visible hoy.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Phone className="h-4 w-4 text-muted-foreground" />
                Contacto principal
              </div>
              <p className="text-sm text-muted-foreground">
                {client.telefonoPrincipal ?? "Sin teléfono principal"}
              </p>
              <p className="text-sm text-muted-foreground">
                {client.emailPrincipal ?? "Sin email principal"}
              </p>
              <p className="text-sm text-muted-foreground">{client.sitioWeb ?? "Sin sitio web"}</p>
            </div>
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Ubicación
              </div>
              <p className="text-sm text-muted-foreground">
                {[client.ciudad, client.provincia, client.pais].filter(Boolean).join(", ") ||
                  "Sin ubicación informada"}
              </p>
              <p className="text-sm text-muted-foreground">
                {client.direccion ?? "Sin dirección informada"}
              </p>
            </div>
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Cobertura comercial
              </div>
              <p className="text-sm text-muted-foreground">Origen: {client.origenCliente}</p>
              <p className="text-sm text-muted-foreground">
                Pipeline visible: {formatPipelineByCurrency(pipelineByCurrency)}
              </p>
              <p className="text-sm text-muted-foreground">
                {opportunitySummary.cierresProximos.length} cierres estimados en los próximos 30
                días
              </p>
            </div>
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4 text-muted-foreground" />
                Responsable
              </div>
              <p className="text-sm text-muted-foreground">
                {responsable
                  ? `${responsable.nombre} ${responsable.apellido}`
                  : "Sin responsable asignado"}
              </p>
              <p className="text-sm text-muted-foreground">
                {responsable?.email ?? "Sin email disponible"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Foco del cliente</CardTitle>
            <CardDescription>
              Prioriza la gestión más relevante sin inventar scoring ni comentarios persistidos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {highlightedOpportunity ? (
              <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4">
                <p className="text-sm font-medium text-sky-900">Oportunidad prioritaria</p>
                <h3 className="mt-1 text-lg font-semibold text-sky-950">
                  {highlightedOpportunity.titulo}
                </h3>
                <p className="text-sm text-sky-900/80">
                  {highlightedOpportunity.etapa.replace("_", " ")} ·{" "}
                  {highlightedOpportunity.probabilidad}%
                </p>
                <p className="mt-2 text-sm font-medium text-sky-950">
                  {formatMoney(highlightedOpportunity.montoEstimado, highlightedOpportunity.moneda)}
                </p>
              </div>
            ) : null}

            {highlightedContact ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                <p className="text-sm font-medium text-amber-900">Contacto a priorizar</p>
                <h3 className="mt-1 text-lg font-semibold text-amber-950">
                  {highlightedContact.nombre} {highlightedContact.apellido}
                </h3>
                <p className="text-sm text-amber-900/80">
                  {highlightedContact.cargo ?? "Sin cargo informado"} ·{" "}
                  {highlightedContact.canalPreferido}
                </p>
                <p className="mt-2 text-sm text-amber-950">
                  {highlightedContact.email ??
                    highlightedContact.telefono ??
                    "Sin dato de contacto directo"}
                </p>
              </div>
            ) : null}

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Los comentarios internos del legado no se exponen en el backend actual. Esta ficha
                usa sólo notas generales, interacciones, tareas y oportunidades visibles hoy.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="contactos" className="space-y-4">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="contactos">
            <Users className="mr-2 h-4 w-4" />
            Contactos ({contactos.length})
          </TabsTrigger>
          <TabsTrigger value="oportunidades">
            <Target className="mr-2 h-4 w-4" />
            Oportunidades ({oportunidades.length})
          </TabsTrigger>
          <TabsTrigger value="interacciones">
            <MessageSquare className="mr-2 h-4 w-4" />
            Interacciones ({interacciones.length})
          </TabsTrigger>
          <TabsTrigger value="tareas">
            <Clock3 className="mr-2 h-4 w-4" />
            Tareas ({tareas.length})
          </TabsTrigger>
          <TabsTrigger value="contexto">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Contexto
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contactos">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Red de contactos</CardTitle>
                <CardDescription>
                  Cobertura visible del cliente por interlocutor, canal preferido y estado actual.
                </CardDescription>
              </div>
              <Button size="sm" asChild>
                <Link href={`/crm/contactos?action=new&clienteId=${id}`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar contacto
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Contacto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contactos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        No hay contactos registrados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    contactos.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">
                          {contact.nombre} {contact.apellido}
                        </TableCell>
                        <TableCell>{contact.cargo ?? "-"}</TableCell>
                        <TableCell>{contact.canalPreferido}</TableCell>
                        <TableCell>{contact.estadoContacto}</TableCell>
                        <TableCell>{contact.email ?? contact.telefono ?? "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="oportunidades">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Pipeline del cliente</CardTitle>
                <CardDescription>
                  Pipeline abierto por etapa y moneda visible, sin mezclar importes multimoneda.
                </CardDescription>
              </div>
              <Button size="sm" asChild>
                <Link href={`/crm/oportunidades?action=new&clienteId=${id}`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva oportunidad
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Probabilidad</TableHead>
                    <TableHead>Cierre estimado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {oportunidades.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        No hay oportunidades registradas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    oportunidades.map((opportunity) => (
                      <TableRow key={opportunity.id}>
                        <TableCell className="font-medium">{opportunity.titulo}</TableCell>
                        <TableCell>{opportunity.etapa.replace("_", " ")}</TableCell>
                        <TableCell>
                          {formatMoney(opportunity.montoEstimado, opportunity.moneda)}
                        </TableCell>
                        <TableCell>{opportunity.probabilidad}%</TableCell>
                        <TableCell>{formatDate(opportunity.fechaEstimadaCierre)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interacciones">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Seguimiento e interacciones</CardTitle>
                <CardDescription>
                  Historial visible de gestión, canal, resultado y responsable.
                </CardDescription>
              </div>
              <Button size="sm" asChild>
                <Link href={`/crm/interacciones?action=new&clienteId=${id}`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva interacción
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {interacciones.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  No hay interacciones registradas.
                </p>
              ) : (
                interacciones.map((interaction) => {
                  const user = usuarios.find(
                    (usuario) => usuario.id === interaction.usuarioResponsableId
                  )
                  return (
                    <div key={interaction.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">
                            {getInteractionLabel(interaction.tipoInteraccion)} · {interaction.canal}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {interaction.descripcion ?? "Sin detalle adicional"}
                          </p>
                        </div>
                        <Badge variant="outline">{interaction.resultado}</Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>{formatDateTime(interaction.fechaHora)}</span>
                        <span>
                          {user ? `${user.nombre} ${user.apellido}` : "Responsable no encontrado"}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tareas">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Backlog del cliente</CardTitle>
                <CardDescription>
                  Tareas abiertas y vencidas sobre este cliente usando el contrato real de CRMTask.
                </CardDescription>
              </div>
              <Button size="sm" asChild>
                <Link href={`/crm/tareas?action=new&clienteId=${id}`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva tarea
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Responsable</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tareas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        No hay tareas registradas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    tareas.map((task) => {
                      const owner = usuarios.find((usuario) => usuario.id === task.asignadoAId)
                      return (
                        <TableRow key={task.id}>
                          <TableCell className="font-medium">{task.titulo}</TableCell>
                          <TableCell>{task.tipoTarea.replace("_", " ")}</TableCell>
                          <TableCell>
                            {owner ? `${owner.nombre} ${owner.apellido}` : "Sin responsable"}
                          </TableCell>
                          <TableCell>{formatDate(task.fechaVencimiento)}</TableCell>
                          <TableCell>
                            <Badge variant={task.estado === "vencida" ? "destructive" : "outline"}>
                              {getTaskStateLabel(task.estado)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contexto">
          <Card>
            <CardHeader>
              <CardTitle>Contexto legado visible</CardTitle>
              <CardDescription>
                La ficha expone lo que hoy está publicado y deja explícitos los límites del
                contrato.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium">Notas generales</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {client.notasGenerales ?? "No hay notas generales publicadas para este cliente."}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium">Lo que sí está visible</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Responsable, contactos, oportunidades, interacciones, tareas, estado de relación y
                  origen del cliente.
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium">Lo que no se simula</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Comentarios persistidos, scoring, health score externo, forecast propietario o
                  historial financiero fuera de las oportunidades visibles.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
