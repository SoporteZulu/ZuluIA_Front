"use client"

import React from "react"
import { AlertCircle, TrendingDown } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useThorCajeros } from "@/lib/hooks/useThor"

function formatCurrency(value: number) {
  return value.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  })
}

function formatDate(value?: Date | string) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "-"
}

function getSatisfactionStars(satisfaction: number) {
  return "★".repeat(Math.round(satisfaction)) + "☆".repeat(5 - Math.round(satisfaction))
}

export default function CajerosModule() {
  const { metricas: cajerosMetricas, loading, error } = useThorCajeros()
  const [selectedCajeroId, setSelectedCajeroId] = React.useState<string>("")

  const sortedByEfficiency = React.useMemo(
    () =>
      [...cajerosMetricas].sort(
        (left, right) => Number(left.tiempoPromedioAtension) - Number(right.tiempoPromedioAtension)
      ),
    [cajerosMetricas]
  )

  React.useEffect(() => {
    if (sortedByEfficiency.length === 0) {
      setSelectedCajeroId("")
      return
    }

    if (
      !selectedCajeroId ||
      !sortedByEfficiency.some((item) => item.cajeroId === selectedCajeroId)
    ) {
      setSelectedCajeroId(sortedByEfficiency[0].cajeroId)
    }
  }, [sortedByEfficiency, selectedCajeroId])

  const selectedCajero = React.useMemo(
    () =>
      sortedByEfficiency.find((item) => item.cajeroId === selectedCajeroId) ??
      sortedByEfficiency[0],
    [sortedByEfficiency, selectedCajeroId]
  )

  const activeCajeros = cajerosMetricas.filter((item) => item.cajero.estado === "activo")
  const sortedBySatisfaction = [...activeCajeros].sort(
    (left, right) => Number(right.satisfaccionCliente ?? 0) - Number(left.satisfaccionCliente ?? 0)
  )
  const averageTime = activeCajeros.length
    ? activeCajeros.reduce((sum, item) => sum + Number(item.tiempoPromedioAtension ?? 0), 0) /
      activeCajeros.length
    : 0
  const totalCustomers = activeCajeros.reduce(
    (sum, item) => sum + Number(item.numeroClientesAtendidos ?? 0),
    0
  )
  const averageSatisfaction = activeCajeros.length
    ? activeCajeros.reduce((sum, item) => sum + Number(item.satisfaccionCliente ?? 0), 0) /
      activeCajeros.length
    : 0
  const totalBilled = activeCajeros.reduce((sum, item) => sum + Number(item.totalFacturado ?? 0), 0)
  const averageErrors = activeCajeros.length
    ? activeCajeros.reduce((sum, item) => sum + Number(item.tasaErrores ?? 0), 0) /
      activeCajeros.length
    : 0

  const scatterData = activeCajeros.map((item) => ({
    tiempoAtencion: Number(item.tiempoPromedioAtension ?? 0),
    satisfaccion: Number(item.satisfaccionCliente ?? 0),
    nombre: `${item.cajero.nombre} ${item.cajero.apellido}`,
    clientes: Number(item.numeroClientesAtendidos ?? 0),
  }))

  const queueAlerts = activeCajeros
    .map((item) => ({
      id: item.cajeroId,
      nombre: `${item.cajero.nombre} ${item.cajero.apellido}`,
      estado:
        Number(item.tasaErrores ?? 0) > averageErrors
          ? "Errores sobre promedio"
          : Number(item.tiempoPromedioAtension ?? 0) > averageTime
            ? "Atención lenta"
            : "Ritmo estable",
      detalle:
        Number(item.tasaErrores ?? 0) > averageErrors
          ? `${Number(item.tasaErrores ?? 0).toFixed(1)}% de errores vs ${averageErrors.toFixed(1)}% del equipo.`
          : Number(item.tiempoPromedioAtension ?? 0) > averageTime
            ? `${Number(item.tiempoPromedioAtension ?? 0).toFixed(0)}s por cliente vs ${averageTime.toFixed(0)}s promedio.`
            : `${Number(item.numeroClientesAtendidos ?? 0)} clientes atendidos con nivel estable.`,
    }))
    .slice(0, 4)

  return (
    <div className="space-y-6 pb-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Ranking de Cajeros - Punto de Venta</h1>
        <p className="text-muted-foreground">
          Performance, eficiencia, errores y satisfacción del cliente sobre el piso comercial
          visible.
        </p>
      </div>

      {error && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Parte de las métricas de cajeros no pudo cargarse por completo. La lectura operativa se
            limita a la tanda visible de backend.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedCajeroId} onValueChange={setSelectedCajeroId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Seleccionar cajero" />
          </SelectTrigger>
          <SelectContent>
            {sortedByEfficiency.map((item) => (
              <SelectItem key={item.cajeroId} value={item.cajeroId}>
                {item.cajero.nombre} {item.cajero.apellido} · Caja {item.cajero.numCaja}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tiempo Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{averageTime.toFixed(0)}s</div>
            <p className="mt-1 text-xs text-muted-foreground">Por cliente en cajas activas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Clientes Atendidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
            <p className="mt-1 text-xs text-muted-foreground">Total visible del período cargado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Facturación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalBilled)}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Importe total de cajas activas visibles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Satisfacción
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {averageSatisfaction.toFixed(1)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Promedio visible sobre 5.0</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cajas Activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCajeros.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Con métricas y estado activo en la tanda visible
            </p>
          </CardContent>
        </Card>
      </div>

      {cajerosMetricas.some((item) => item.cajero.estado === "ausente") && (
        <Alert className="border-orange-200 bg-orange-50">
          <TrendingDown className="h-4 w-4" />
          <AlertDescription>
            Hay cajas ausentes en la capa visible. La comparación se apoya sólo en los cajeros con
            métrica efectiva del backend actual.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="ranking" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
          <TabsTrigger value="analisis">Análisis Detallado</TabsTrigger>
          <TabsTrigger value="ocupacion">Ocupación de Cajas</TabsTrigger>
          <TabsTrigger value="relaciones">Relaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="ranking" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top por Eficiencia</CardTitle>
                <CardDescription>Menor tiempo de atención</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {sortedByEfficiency.slice(0, 3).map((cm, idx) => (
                  <div
                    key={cm.cajeroId}
                    onClick={() => setSelectedCajeroId(cm.cajeroId)}
                    className={`cursor-pointer rounded-lg p-3 transition-shadow hover:shadow-md ${idx === 0 ? "bg-green-100 text-green-800" : idx === 1 ? "bg-blue-100 text-blue-800" : idx === 2 ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-800"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">#{idx + 1}</span>
                        <div>
                          <p className="font-semibold text-sm">
                            {cm.cajero.nombre} {cm.cajero.apellido}
                          </p>
                          <p className="text-xs opacity-75">Caja {cm.cajero.numCaja}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">{cm.tiempoPromedioAtension}s</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top por Satisfacción</CardTitle>
                <CardDescription>Mayor puntuación de clientes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {sortedBySatisfaction.slice(0, 3).map((cm, idx) => (
                  <div
                    key={cm.cajeroId}
                    onClick={() => setSelectedCajeroId(cm.cajeroId)}
                    className={`cursor-pointer rounded-lg p-3 transition-shadow hover:shadow-md ${idx === 0 ? "bg-green-100 text-green-800" : idx === 1 ? "bg-blue-100 text-blue-800" : idx === 2 ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-800"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">#{idx + 1}</span>
                        <div>
                          <p className="font-semibold text-sm">
                            {cm.cajero.nombre} {cm.cajero.apellido}
                          </p>
                          <p className="text-xs opacity-75">Caja {cm.cajero.numCaja}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-yellow-500">
                          {getSatisfactionStars(cm.satisfaccionCliente || 0)}
                        </p>
                        <p className="text-xs opacity-75 font-semibold">
                          {cm.satisfaccionCliente?.toFixed(1)}/5
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Caja</TableHead>
                    <TableHead>Cajero</TableHead>
                    <TableHead className="text-right">Tiempo Prom.</TableHead>
                    <TableHead className="text-right">Clientes</TableHead>
                    <TableHead className="text-right">Facturado</TableHead>
                    <TableHead className="text-right">Errores</TableHead>
                    <TableHead className="text-right">Satisfacción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedByEfficiency.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        {loading
                          ? "Cargando ranking de cajeros..."
                          : "No hay métricas visibles para el punto de venta."}
                      </TableCell>
                    </TableRow>
                  )}
                  {sortedByEfficiency.map((cm) => (
                    <TableRow
                      key={cm.cajeroId}
                      onClick={() => setSelectedCajeroId(cm.cajeroId)}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell>
                        <Badge variant="outline">Caja {cm.cajero.numCaja}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {cm.cajero.nombre} {cm.cajero.apellido}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {cm.tiempoPromedioAtension}s
                      </TableCell>
                      <TableCell className="text-right">{cm.numeroClientesAtendidos}</TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(Number(cm.totalFacturado ?? 0))}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            Number(cm.tasaErrores ?? 0) <= averageErrors ? "secondary" : "outline"
                          }
                          className="text-xs"
                        >
                          {Number(cm.tasaErrores ?? 0).toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-yellow-500">
                          {getSatisfactionStars(Number(cm.satisfaccionCliente ?? 0))}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analisis" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {selectedCajero?.cajero.nombre ?? "Cajero"} - Detalle
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <p className="text-xs text-muted-foreground">Tiempo Promedio</p>
                    <p className="text-xl font-bold text-blue-600">
                      {selectedCajero?.tiempoPromedioAtension ?? 0}s
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                    <p className="text-xs text-muted-foreground">Clientes Hoy</p>
                    <p className="text-xl font-bold text-green-600">
                      {selectedCajero?.numeroClientesAtendidos ?? 0}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                    <p className="text-xs text-muted-foreground">Facturación</p>
                    <p className="text-xl font-bold text-orange-600">
                      {formatCurrency(Number(selectedCajero?.totalFacturado ?? 0))}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-xs text-muted-foreground">Tasa de Errores</p>
                    <p className="text-xl font-bold text-red-600">
                      {Number(selectedCajero?.tasaErrores ?? 0).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Satisfacción del Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-6xl text-yellow-500 mb-2">
                    {getSatisfactionStars(Number(selectedCajero?.satisfaccionCliente ?? 0))}
                  </div>
                  <p className="text-3xl font-bold">
                    {Number(selectedCajero?.satisfaccionCliente ?? 0).toFixed(1)}
                  </p>
                  <p className="text-sm text-muted-foreground">De 5.0 estrellas</p>
                </div>
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-xs font-semibold text-green-900">
                    {(selectedCajero?.satisfaccionCliente ?? 0) >= 4.7 && "Excelente performance ✓"}
                    {(selectedCajero?.satisfaccionCliente ?? 0) >= 4.5 &&
                      (selectedCajero?.satisfaccionCliente ?? 0) < 4.7 &&
                      "Muy buen desempeño"}
                    {(selectedCajero?.satisfaccionCliente ?? 0) < 4.5 && "Requiere mejora"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Información de Contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Email:</span>
                <p className="font-mono">{selectedCajero?.cajero.email ?? "-"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Estado:</span>
                <Badge
                  className="ml-2"
                  variant={selectedCajero?.cajero.estado === "activo" ? "default" : "secondary"}
                >
                  {selectedCajero?.cajero.estado ?? "Sin dato"}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Última lectura</span>
                <p className="font-mono">{formatDate(selectedCajero?.fecha)}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ocupacion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actividad por Hora</CardTitle>
              <CardDescription>
                Clientes atendidos por caja según la capa visible de métricas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ocupacionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hora" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="caja1" fill="#3b82f6" name="Caja 1" />
                  <Bar dataKey="caja2" fill="#10b981" name="Caja 2" />
                  <Bar dataKey="caja3" fill="#f59e0b" name="Caja 3" />
                  <Bar dataKey="caja4" fill="#8b5cf6" name="Caja 4" />
                  <Bar dataKey="caja5" fill="#ec4899" name="Caja 5" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Señales de Piso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {queueAlerts.map((alert) => (
                <div key={alert.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{alert.nombre}</p>
                    <Badge variant={alert.estado === "Ritmo estable" ? "secondary" : "outline"}>
                      {alert.estado}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{alert.detalle}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="relaciones" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tiempo de Atención vs Satisfacción</CardTitle>
              <CardDescription>
                Análisis de relación entre eficiencia y satisfacción
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart data={scatterData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tiempoAtencion" name="Tiempo (segundos)" />
                  <YAxis dataKey="satisfaccion" name="Satisfacción (0-5)" />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                  <Scatter name="Cajeros" data={scatterData} fill="#3b82f6" />
                </ScatterChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground mt-4 text-center">
                La relación visible permite detectar si más tiempo de atención realmente mejora
                satisfacción o sólo agrega fricción operativa.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
