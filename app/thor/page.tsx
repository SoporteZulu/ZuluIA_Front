'use client'

import React from 'react'
import { BarChart3, TrendingUp, Users, ShoppingCart, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { calcularKPIsMensuales, historicoVentas, vendedoresMetricas, cajerosMetricas } from '@/lib/thor-data'
import Link from 'next/link'

const ThorDashboard = () => {
  const kpis = calcularKPIsMensuales()
  const topVendedor = vendedoresMetricas[0]
  const topCajero = cajerosMetricas[0]

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-4xl">⚡</span>
          <h1 className="text-3xl font-bold tracking-tight">THOR - Business Intelligence + IA</h1>
        </div>
        <p className="text-muted-foreground">Sistema de análisis inteligente para mayoristas y supermercados</p>
      </div>

      {/* KPIs Principales */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ventas Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(kpis.ventasTotales / 1000).toFixed(1)}K</div>
            <p className={`text-xs mt-1 ${kpis.cambioMes > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {kpis.cambioMes > 0 ? '↑' : '↓'} {Math.abs(kpis.cambioMes).toFixed(1)}% vs mes anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Margen Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{kpis.margenPromedio.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">De todas las ventas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ticket Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${kpis.ticketPromedio.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Por transacción</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Transacciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.numeroTransacciones}</div>
            <p className="text-xs text-muted-foreground mt-1">En el período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rotación Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.rotacionPromedio.toFixed(1)} días</div>
            <p className="text-xs text-muted-foreground mt-1">Por producto</p>
          </CardContent>
        </Card>
      </div>

      {/* Módulos Principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Sugerencias IA */}
        <Link href="/thor/sugerencias">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🤖</span>
                <CardTitle className="text-base">Sugerencias IA</CardTitle>
              </div>
              <CardDescription>Artículos más vendidos recomendados</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Análisis de rotación, estacionalidad y tendencias</p>
            </CardContent>
          </Card>
        </Link>

        {/* Mejores Márgenes */}
        <Link href="/thor/margenes">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">💰</span>
                <CardTitle className="text-base">Mejores Márgenes</CardTitle>
              </div>
              <CardDescription>Top 10 productos por ganancia</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Ranking interactivo con gráficos comparativos</p>
            </CardContent>
          </Card>
        </Link>

        {/* KPIs y Predicciones */}
        <Link href="/thor/kpis">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">📊</span>
                <CardTitle className="text-base">KPIs y Predicciones</CardTitle>
              </div>
              <CardDescription>Análisis histórico y predicción IA</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Gráficos con línea de tendencia y simulaciones</p>
            </CardContent>
          </Card>
        </Link>

        {/* Ranking Vendedores */}
        <Link href="/thor/vendedores">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🏆</span>
                <CardTitle className="text-base">Ranking Vendedores</CardTitle>
              </div>
              <CardDescription>Performance y métricas del equipo</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Podio visual y análisis comparativo</p>
            </CardContent>
          </Card>
        </Link>

        {/* Ranking Cajeros */}
        <Link href="/thor/cajeros">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🛒</span>
                <CardTitle className="text-base">Ranking Cajeros</CardTitle>
              </div>
              <CardDescription>Performance de punto de venta</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Tiempo de atención y satisfacción del cliente</p>
            </CardContent>
          </Card>
        </Link>

        {/* Análisis Competencia */}
        <Link href="/thor/competencia">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🔍</span>
                <CardTitle className="text-base">Análisis Competencia</CardTitle>
              </div>
              <CardDescription>Comparación de precios y posicionamiento</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Oportunidades de diferenciación</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Panel de Highlights */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Top Vendedor */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Top Vendedor del Mes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-4xl">🥇</span>
              <div>
                <p className="font-semibold">{topVendedor.vendedor.nombre} {topVendedor.vendedor.apellido}</p>
                <Badge variant="default">${topVendedor.totalVendido.toLocaleString('es-AR')}</Badge>
              </div>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Transacciones: {topVendedor.numeroTransacciones}</p>
              <p>Ticket Promedio: ${topVendedor.ticketPromedio.toFixed(0)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Top Cajero */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Top Cajero (Eficiencia)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-4xl">⚡</span>
              <div>
                <p className="font-semibold">{topCajero.cajero.nombre} {topCajero.cajero.apellido}</p>
                <Badge variant="secondary">{topCajero.tiempoPromedioAtension}s/cliente</Badge>
              </div>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Clientes: {topCajero.numeroClientesAtendidos}</p>
              <p>Satisfacción: {topCajero.satisfaccionCliente?.toFixed(1)}/5.0 ⭐</p>
            </div>
          </CardContent>
        </Card>

        {/* Últimas Tendencias */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tendencias Detectadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-green-600 mt-1" />
              <div className="text-sm">
                <p className="font-semibold">Aumento de 15.8%</p>
                <p className="text-xs text-muted-foreground">Vs mes anterior</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600 mt-1" />
              <div className="text-sm">
                <p className="font-semibold">Stock bajo en 2 SKUs</p>
                <p className="text-xs text-muted-foreground">Requiere reabastecimiento</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ThorDashboard
