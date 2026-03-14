'use client'

import React, { useState } from 'react'
import { Plus, Grid3x3, List, Kanban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useProyectos } from '@/lib/hooks/useProyectos'
import type { Proyecto } from '@/lib/proyectos-types'

const ProyectosListPage = () => {
  const { proyectos, loading } = useProyectos()
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'kanban'>('grid')
  const [filtroEstado, setFiltroEstado] = useState<string | null>(null)

  const proyectosFiltrados = filtroEstado 
    ? proyectos.filter(p => p.estado === filtroEstado)
    : proyectos

  const estadoColor = (estado: string) => {
    const colores: Record<string, string> = {
      'En Planificación': 'bg-blue-100 text-blue-800',
      'En Curso': 'bg-green-100 text-green-800',
      'En Riesgo': 'bg-orange-100 text-orange-800',
      'Completado': 'bg-purple-100 text-purple-800',
      'Retrasado': 'bg-red-100 text-red-800',
      'En Espera': 'bg-gray-100 text-gray-800',
    }
    return colores[estado] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="flex-1 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">Proyectos</h1>
          <p className="text-muted-foreground mt-1">Gestión de todos los proyectos activos</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Proyecto
        </Button>
      </div>

      {/* Vista Controles */}
      <div className="flex gap-2 border-b pb-4">
        <Button 
          variant={viewMode === 'grid' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setViewMode('grid')}
        >
          <Grid3x3 className="h-4 w-4" />
        </Button>
        <Button 
          variant={viewMode === 'list' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setViewMode('list')}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button 
          variant={viewMode === 'kanban' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setViewMode('kanban')}
        >
          <Kanban className="h-4 w-4" />
        </Button>
      </div>

      {/* Vista GRILLA */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {proyectosFiltrados.map((proyecto) => (
            <Card key={proyecto.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">{proyecto.nombre}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{proyecto.cliente}</p>
                  </div>
                  <Badge className={estadoColor(proyecto.estado)}>
                    {proyecto.estado}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Avance</span>
                    <span className="font-medium">{proyecto.avance}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" 
                      style={{width: `${proyecto.avance}%`}}
                    ></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Presupuesto</p>
                    <p className="font-semibold">${(proyecto.presupuesto / 1000).toFixed(0)}K</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Prioridad</p>
                    <Badge variant="outline" className="text-xs">{proyecto.prioridad}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Vista LISTA */}
      {viewMode === 'list' && (
        <div className="space-y-2">
          {proyectosFiltrados.map((proyecto) => (
            <Card key={proyecto.id} className="hover:bg-muted/50 cursor-pointer transition-colors">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{proyecto.nombre}</h3>
                    <p className="text-sm text-muted-foreground">{proyecto.cliente}</p>
                  </div>
                  <div className="flex-1">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500" 
                        style={{width: `${proyecto.avance}%`}}
                      ></div>
                    </div>
                  </div>
                  <div className="w-32 text-right">
                    <Badge className={estadoColor(proyecto.estado)}>
                      {proyecto.estado}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Vista KANBAN */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto pb-4">
          {['En Planificación', 'En Curso', 'En Riesgo', 'Completado', 'Retrasado', 'En Espera'].map((estado) => (
            <div key={estado} className="flex-shrink-0 w-80 bg-muted/30 rounded-lg p-4">
              <h3 className="font-semibold mb-4 text-sm">{estado}</h3>
              <div className="space-y-2">
                {proyectosFiltrados.filter(p => p.estado === estado).map((proyecto) => (
                  <Card key={proyecto.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-3 space-y-2">
                      <p className="font-medium text-sm">{proyecto.nombre}</p>
                      <p className="text-xs text-muted-foreground">{proyecto.cliente}</p>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500" 
                          style={{width: `${proyecto.avance}%`}}
                        ></div>
                      </div>
                      <p className="text-xs font-medium">{proyecto.avance}%</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ProyectosListPage
