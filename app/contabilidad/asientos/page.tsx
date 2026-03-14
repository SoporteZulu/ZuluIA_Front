"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Filter, MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Suspense } from "react"
import Loading from "./loading"
import { useAsientos } from "@/lib/hooks/useAsientos"
import { useEjercicioVigente } from "@/lib/hooks/useEjercicios"

function getStatusBadge(status: string) {
  const s = status.toLowerCase()
  switch (s) {
    case "borrador":
      return <Badge variant="secondary">Borrador</Badge>
    case "publicado":
      return <Badge variant="secondary" className="bg-green-500/10 text-green-500">Publicado</Badge>
    case "anulado":
      return <Badge variant="destructive">Anulado</Badge>
    default:
      return <Badge variant="outline" className="capitalize">{status}</Badge>
  }
}

function AsientosContent() {
  const { ejercicio } = useEjercicioVigente()
  const { asientos, loading, error } = useAsientos({ ejercicioId: ejercicio?.id })
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => asientos.filter(a =>
    a.descripcion?.toLowerCase().includes(search.toLowerCase()) ||
    String(a.numero ?? '').includes(search)
  ), [asientos, search])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Asientos Contables</h1>
          <p className="text-muted-foreground">
            Registra y administra asientos en el libro diario.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Asiento
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar asientos..."
                className="pl-8"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : error ? (
            <p className="text-center py-8 text-red-600 text-sm">{error}</p>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numero</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Descripcion</TableHead>
                <TableHead className="text-right">Debe</TableHead>
                <TableHead className="text-right">Haber</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Sin asientos registrados.</TableCell></TableRow>
              ) : filtered.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-mono text-sm">{entry.numero ?? `AS-${entry.id}`}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(entry.fecha).toLocaleDateString('es-AR')}</TableCell>
                  <TableCell className="font-medium max-w-[300px] truncate">{entry.descripcion}</TableCell>
                  <TableCell className="text-right font-mono">${(entry.totalDebe ?? 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono">${(entry.totalHaber ?? 0).toLocaleString()}</TableCell>
                  <TableCell>{getStatusBadge(entry.estado)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Ver detalles</DropdownMenuItem>
                        <DropdownMenuItem>Publicar</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Anular</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function AsientosPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AsientosContent />
    </Suspense>
  )
}
