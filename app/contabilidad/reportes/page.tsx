"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, Search, AlertCircle } from "lucide-react"
import { useLibroIva } from "@/lib/hooks/useLibroIva"
import { useAsientos } from "@/lib/hooks/useAsientos"
import { useEjercicioVigente } from "@/lib/hooks/useEjercicios"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"

function fmtARS(n: number) {
  return Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })
}

function LibroIvaTab({ tipo }: { tipo: 'ventas' | 'compras' }) {
  const sucursalId = useDefaultSucursalId() ?? 1
  const { libroVentas, libroCompras, loading, error, fetchVentas, fetchCompras } = useLibroIva()
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const libro = tipo === 'ventas' ? libroVentas : libroCompras
  const title = tipo === 'ventas' ? 'Libro IVA Ventas' : 'Libro IVA Compras'

  const handleBuscar = () => {
    if (!desde || !hasta) return
    if (tipo === 'ventas') fetchVentas(sucursalId, desde, hasta)
    else fetchCompras(sucursalId, desde, hasta)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Desde</Label>
          <Input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Hasta</Label>
          <Input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="w-40" />
        </div>
        <Button onClick={handleBuscar} disabled={loading || !desde || !hasta}>
          <Search className="h-4 w-4 mr-2" />
          Generar
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && <p className="text-sm text-muted-foreground">Cargando {title}…</p>}

      {libro && !loading && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>
              {libro.desde} → {libro.hasta} · Sucursal {libro.sucursalId}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Comprobante</TableHead>
                  <TableHead>Tercero</TableHead>
                  <TableHead>CUIT</TableHead>
                  <TableHead className="text-right">Neto Grav.</TableHead>
                  <TableHead className="text-right">IVA RI</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(libro.lineas ?? []).map((l, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{l.fecha}</TableCell>
                    <TableCell className="text-sm">
                      <Badge variant="outline">{l.tipoComprobante}</Badge>
                      {l.numero && <span className="ml-1 text-xs">{l.numero}</span>}
                    </TableCell>
                    <TableCell className="text-sm">{l.terceroRazonSocial ?? '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{l.terceroCuit ?? '-'}</TableCell>
                    <TableCell className="text-right text-sm">${fmtARS(l.netoGravado)}</TableCell>
                    <TableCell className="text-right text-sm">${fmtARS(l.ivaRi)}</TableCell>
                    <TableCell className="text-right font-medium">${fmtARS(l.total)}</TableCell>
                  </TableRow>
                ))}
                {(libro.lineas ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Sin registros en el período</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="px-4 py-3 border-t flex justify-end gap-6 text-sm">
              <span>Neto Grav.: <strong>${fmtARS(libro.totalNetoGravado ?? 0)}</strong></span>
              <span>IVA RI: <strong>${fmtARS(libro.totalIvaRi ?? 0)}</strong></span>
              <span className="text-base font-bold">Total: ${fmtARS(libro.totalGeneral ?? 0)}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function LibroDiarioTab() {
  const sucursalId = useDefaultSucursalId() ?? 1
  const { ejercicio } = useEjercicioVigente()
  const { asientos, loading, error, getLibroDiario } = useAsientos({ ejercicioId: ejercicio?.id, sucursalId })
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [libroDiario, setLibroDiario] = useState<unknown>(null)

  const handleBuscar = async () => {
    if (!ejercicio?.id || !desde || !hasta) return
    const result = await getLibroDiario(ejercicio.id, sucursalId, desde, hasta)
    setLibroDiario(result)
  }

  const data = libroDiario as { totalAsientos?: number; totalDebe?: number; totalHaber?: number; asientos?: { id: number; fecha: string; numero: string; descripcion: string; totalDebe: number; totalHaber: number }[] } | null

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Desde</Label>
          <Input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Hasta</Label>
          <Input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="w-40" />
        </div>
        <Button onClick={handleBuscar} disabled={loading || !desde || !hasta || !ejercicio?.id}>
          <Search className="h-4 w-4 mr-2" />
          Generar
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && <p className="text-sm text-muted-foreground">Cargando Libro Diario…</p>}

      {data && !loading && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Libro Diario</CardTitle>
            <CardDescription>
              {data.totalAsientos ?? 0} asientos · Debe: ${fmtARS(data.totalDebe ?? 0)} · Haber: ${fmtARS(data.totalHaber ?? 0)}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Nro.</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Debe</TableHead>
                  <TableHead className="text-right">Haber</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.asientos ?? []).map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="text-sm">{a.fecha}</TableCell>
                    <TableCell className="text-sm font-mono">{a.numero}</TableCell>
                    <TableCell className="text-sm">{a.descripcion}</TableCell>
                    <TableCell className="text-right text-sm">${fmtARS(a.totalDebe)}</TableCell>
                    <TableCell className="text-right text-sm">${fmtARS(a.totalHaber)}</TableCell>
                  </TableRow>
                ))}
                {(data.asientos ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sin asientos en el período</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!data && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Seleccioná un período para ver el libro diario</p>
        </div>
      )}
    </div>
  )
}

export default function ReportesContablesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reportes Contables</h1>
        <p className="text-muted-foreground">
          Genera Libro IVA Ventas, Libro IVA Compras y Libro Diario desde el backend.
        </p>
      </div>

      <Tabs defaultValue="iva-ventas" className="w-full">
        <TabsList>
          <TabsTrigger value="iva-ventas">Libro IVA Ventas</TabsTrigger>
          <TabsTrigger value="iva-compras">Libro IVA Compras</TabsTrigger>
          <TabsTrigger value="diario">Libro Diario</TabsTrigger>
        </TabsList>

        <TabsContent value="iva-ventas" className="mt-6">
          <LibroIvaTab tipo="ventas" />
        </TabsContent>

        <TabsContent value="iva-compras" className="mt-6">
          <LibroIvaTab tipo="compras" />
        </TabsContent>

        <TabsContent value="diario" className="mt-6">
          <LibroDiarioTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

