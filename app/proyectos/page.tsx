'use client'

import React from 'react'
import { BarChart3, TrendingUp, Users, Briefcase, AlertCircle, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { proyectos, miembros, clientes } from '@/lib/proyectos-data'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'

const ProyectosDashboard = () => {
  const estadisticas = {
    activos: proyectos.filter(p => p.estado === 'En Curso').length,
    completados: proyectos.filter(p => p.estado === 'Completado').length,
    enRiesgo: proyectos.filter(p => p.estado === 'En Riesgo').length,
    totalMiembros: miembros.length,
    ingresosMensuales: clientes.reduce((sum, c) => sum + c.ingresos, 0),
  }

  const dataProgreso = proyectos.map(p => ({
    nombre: p.nombre.substring(0, 15),
    avance: p.avance,
    presupuesto: p.presupuesto / 100000,
  }))

  return (
    <div className="flex-1 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-primary">Dashboard - ZULU Proyectos</h1>
        <p className="text-muted-foreground mt-1">Visión general de proyectos, equipo y presupuestos</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Proyectos Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{estadisticas.activos}</p>
            <p className="text-xs text-green-600 mt-1">+2 esta semana</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{estadisticas.completados}</p>
            <p className="text-xs text-blue-600 mt-1">100% en tiempo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              En Riesgo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">{estadisticas.enRiesgo}</p>
            <p className="text-xs text-orange-600 mt-1">Requiere atención</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Miembros del Equipo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{estadisticas.totalMiembros}</p>
            <p className="text-xs text-muted-foreground mt-1">7 activos online</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos Mensuales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${(estadisticas.ingresosMensuales / 1000000).toFixed(1)}M</p>
            <p className="text-xs text-green-600 mt-1">+15% vs mes anterior</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progreso por Proyecto</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dataProgreso}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="avance" fill="#6366f1" name="Avance %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Proyectos Activos por Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {clientes.map((cliente) => (
                <div key={cliente.id} className="flex justify-between items-center p-2 rounded hover:bg-muted/50">
                  <div>
                    <p className="font-medium text-sm">{cliente.nombre}</p>
                    <p className="text-xs text-muted-foreground">{cliente.sector}</p>
                  </div>
                  <Badge variant="outline">{cliente.proyectos} proyectos</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Proyectos Activos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Proyectos Activos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {proyectos.filter(p => p.estado === 'En Curso').map((proyecto) => (
              <div key={proyecto.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold">{proyecto.nombre}</h3>
                  <Badge>{proyecto.estado}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{proyecto.cliente}</p>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex-1">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500" style={{width: `${proyecto.avance}%`}}></div>
                    </div>
                  </div>
                  <span className="ml-3 font-medium">{proyecto.avance}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ProyectosDashboard
