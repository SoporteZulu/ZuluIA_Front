'use client'

import React, { useState } from 'react'
import { Download, Filter, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts'

const AnaliticasPage = () => {
  const [timeRange, setTimeRange] = useState('mes')

  const kpis = [
    { titulo: 'Proyectos a Tiempo', valor: '75%', tendencia: 'up', color: 'text-green-600' },
    { titulo: 'Presupuesto Adherencia', valor: '92%', tendencia: 'up', color: 'text-green-600' },
    { titulo: 'Utilización de Recursos', valor: '85%', tendencia: 'up', color: 'text-green-600' },
    { titulo: 'Desviación de Cronograma', valor: '-3 días', tendencia: 'down', color: 'text-orange-600' },
  ]

  const proyectoData = [
    { mes: 'Ene', completados: 2, enCurso: 5, retrasados: 1 },
    { mes: 'Feb', completados: 3, enCurso: 4, retrasados: 2 },
    { mes: 'Mar', completados: 4, enCurso: 4, retrasados: 1 },
  ]

  const presupuestoData = [
    { semana: 'S1', presupuestado: 50000, real: 48000 },
    { semana: 'S2', presupuestado: 50000, real: 52000 },
    { semana: 'S3', presupuestado: 50000, real: 50500 },
    { semana: 'S4', presupuestado: 50000, real: 49800 },
  ]

  const eficienciaData = [
    { proyecto: 'A', eficiencia: 85, horas: 240 },
    { proyecto: 'B', eficiencia: 78, horas: 200 },
    { proyecto: 'C', eficiencia: 92, horas: 180 },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analíticas</h1>
          <p className="text-muted-foreground mt-1">Reportes y análisis de proyectos</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semana">Esta Semana</SelectItem>
              <SelectItem value="mes">Este Mes</SelectItem>
              <SelectItem value="trimestre">Este Trimestre</SelectItem>
              <SelectItem value="año">Este Año</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm text-muted-foreground">{kpi.titulo}</CardTitle>
                {kpi.tendencia === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.valor}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Evolución de Proyectos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={proyectoData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completados" fill="#10b981" />
                <Bar dataKey="enCurso" fill="#6366f1" />
                <Bar dataKey="retrasados" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Presupuesto vs Real</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={presupuestoData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="semana" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="presupuestado" fill="#6366f1" stroke="#6366f1" opacity={0.6} />
                <Area type="monotone" dataKey="real" fill="#f59e0b" stroke="#f59e0b" opacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Eficiencia por Proyecto</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="eficiencia" name="Eficiencia %" unit="%" />
                <YAxis type="number" dataKey="horas" name="Horas" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter name="Proyectos" data={eficienciaData} fill="#6366f1" />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumen de Proyectos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { nombre: 'Proyecto A', progress: 65, status: 'En Tiempo' },
              { nombre: 'Proyecto B', progress: 45, status: 'En Tiempo' },
              { nombre: 'Proyecto C', progress: 82, status: 'Adelantado' },
            ].map((p, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="font-medium">{p.nombre}</p>
                  <Badge variant={p.status === 'Adelantado' ? 'default' : 'outline'}>
                    {p.status}
                  </Badge>
                </div>
                <div className="w-full bg-muted rounded h-2">
                  <div className="bg-primary h-2 rounded" style={{ width: `${p.progress}%` }}></div>
                </div>
                <p className="text-xs text-muted-foreground">{p.progress}% completado</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Análisis de Riesgos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { proyecto: 'Proyecto C', riesgo: 'Presupuesto en riesgo', nivel: 'Alto', acción: 'Revisión urgente recomendada' },
            { proyecto: 'Proyecto B', riesgo: 'Retraso en cronograma', nivel: 'Medio', acción: 'Monitoreo semanal' },
            { proyecto: 'Proyecto A', riesgo: 'Disponibilidad de recursos', nivel: 'Bajo', acción: 'Plan de contingencia' },
          ].map((r, i) => (
            <div key={i} className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 border">
              <AlertCircle className={`h-5 w-5 mt-1 flex-shrink-0 ${
                r.nivel === 'Alto' ? 'text-red-600' : r.nivel === 'Medio' ? 'text-orange-600' : 'text-yellow-600'
              }`} />
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <p className="font-medium">{r.proyecto}</p>
                  <Badge variant={r.nivel === 'Alto' ? 'destructive' : 'outline'}>{r.nivel}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{r.riesgo}</p>
                <p className="text-xs text-muted-foreground mt-1">Acción: {r.acción}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export default AnaliticasPage
