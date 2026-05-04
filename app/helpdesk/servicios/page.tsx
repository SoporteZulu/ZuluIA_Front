"use client"

import { Suspense, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, Search, MoreHorizontal, Edit, Trash2, Clock, DollarSign, X } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  useHdCategorias,
  useHdFacturacion,
  useHdOrdenesServicio,
  useHdServicios,
} from "@/lib/hooks/useHelpdesk"
import type { HDCategoriaServicio, HDServicio } from "@/lib/types"

type HdCategoryOption = {
  id: string
  nombre: string
}

function getCategoriaLabel(id?: string | null) {
  if (!id) return "-"

  const cleaned = id.trim()
  const match = cleaned.match(/^cat[-_ ]?(\d+)$/i)
  if (match) return `Categoria ${match[1]}`

  return cleaned
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")
}

function buildCategoriaOptions(
  categorias: HDCategoriaServicio[],
  extraIds: Array<string | null | undefined>
): HdCategoryOption[] {
  const options = new Map<string, string>()

  categorias.forEach((categoria) => {
    options.set(categoria.id, categoria.nombre)
  })

  extraIds.forEach((id) => {
    if (!id || options.has(id)) return
    options.set(id, getCategoriaLabel(id))
  })

  return Array.from(options.entries()).map(([id, nombre]) => ({ id, nombre }))
}

const tipoPrecioLabels: Record<string, string> = {
  mensual: "Mensual",
  evento: "Por Evento",
  fijo: "Precio Fijo",
  por_hora: "Por Hora",
  por_proyecto: "Por Proyecto",
  escalonado: "Escalonado",
}

function humanizeLabel(value?: string | null) {
  if (!value) return "-"

  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")
}

function getTipoPrecioLabel(tipo?: string | null) {
  if (!tipo) return "Sin tipo"
  return tipoPrecioLabels[tipo] ?? humanizeLabel(tipo)
}

function ServiciosContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { categorias } = useHdCategorias()
  const [today] = useState(() => new Date())
  const {
    servicios: serviciosList,
    createServicio,
    updateServicio,
    deleteServicio,
  } = useHdServicios()
  const { ordenes: hdOrdenesServicio } = useHdOrdenesServicio()
  const { facturas: hdFacturas } = useHdFacturacion()
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategoria, setFilterCategoria] = useState<string>("todos")
  const [filterEstado, setFilterEstado] = useState<string>("todos")
  const [isFormOpen, setIsFormOpen] = useState(searchParams.get("action") === "new")
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedServicioId, setSelectedServicioId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
    categoriaId: "",
    duracionEstimada: 60,
    precioBase: 0,
    tipoPrecio: "mensual" as HDServicio["tipoPrecio"],
    garantiaDias: 0,
    condiciones: "",
    estado: "activo" as HDServicio["estado"],
  })

  const categoriaOptions = useMemo(
    () =>
      buildCategoriaOptions(
        categorias,
        serviciosList
          .map((servicio) => servicio.categoriaId)
          .concat([filterCategoria !== "todos" ? filterCategoria : null, formData.categoriaId])
      ),
    [categorias, serviciosList, filterCategoria, formData.categoriaId]
  )

  const categoriaNameById = useMemo(
    () => new Map(categoriaOptions.map((categoria) => [categoria.id, categoria.nombre])),
    [categoriaOptions]
  )

  const selectedServicio = useMemo(
    () => serviciosList.find((servicio) => servicio.id === selectedServicioId) ?? null,
    [selectedServicioId, serviciosList]
  )

  const filteredServicios = serviciosList.filter((servicio) => {
    const matchesSearch =
      servicio.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      servicio.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategoria = filterCategoria === "todos" || servicio.categoriaId === filterCategoria
    const matchesEstado = filterEstado === "todos" || servicio.estado === filterEstado
    return matchesSearch && matchesCategoria && matchesEstado
  })

  const serviceIds = useMemo(
    () => new Set(filteredServicios.map((servicio) => servicio.id)),
    [filteredServicios]
  )

  const ordersByService = useMemo(() => {
    const map = new Map<string, typeof hdOrdenesServicio>()

    hdOrdenesServicio.forEach((orden) => {
      if (!serviceIds.has(orden.servicioId)) return
      map.set(orden.servicioId, [...(map.get(orden.servicioId) ?? []), orden])
    })

    return map
  }, [hdOrdenesServicio, serviceIds])

  const invoiceItemsByService = useMemo(() => {
    const map = new Map<
      string,
      Array<{ moneda: string; total: number; estado: string; ordenServicioId?: string }>
    >()

    hdFacturas.forEach((factura) => {
      factura.items.forEach((item) => {
        if (!item.servicioId || !serviceIds.has(item.servicioId)) return
        map.set(item.servicioId, [
          ...(map.get(item.servicioId) ?? []),
          {
            moneda: factura.moneda,
            total: item.total,
            estado: factura.estado,
            ordenServicioId: item.ordenServicioId,
          },
        ])
      })
    })

    return map
  }, [hdFacturas, serviceIds])

  const summary = useMemo(() => {
    const activos = filteredServicios.filter((servicio) => servicio.estado === "activo")
    const conGarantia = filteredServicios.filter((servicio) => (servicio.garantiaDias ?? 0) > 0)
    const conOrdenesAbiertas = filteredServicios.filter((servicio) => {
      const ordenes = ordersByService.get(servicio.id) ?? []
      return ordenes.some((orden) => !["completada", "cancelada"].includes(orden.estado))
    })
    const conFacturacion = filteredServicios.filter(
      (servicio) => (invoiceItemsByService.get(servicio.id) ?? []).length > 0
    )

    return {
      activos: activos.length,
      visibles: filteredServicios.length,
      conGarantia: conGarantia.length,
      conOrdenesAbiertas: conOrdenesAbiertas.length,
      conFacturacion: conFacturacion.length,
    }
  }, [filteredServicios, invoiceItemsByService, ordersByService])

  const categoryCoverage = useMemo(() => {
    return filteredServicios
      .reduce<
        Array<{
          categoria: string
          total: number
          activos: number
          ordenes: number
          garantia: number
        }>
      >((acc, servicio) => {
        const categoria =
          categoriaNameById.get(servicio.categoriaId) ?? getCategoriaLabel(servicio.categoriaId)
        const existing = acc.find((item) => item.categoria === categoria)
        const ordenes = (ordersByService.get(servicio.id) ?? []).length
        const garantia = (servicio.garantiaDias ?? 0) > 0 ? 1 : 0

        if (existing) {
          existing.total += 1
          if (servicio.estado === "activo") existing.activos += 1
          existing.ordenes += ordenes
          existing.garantia += garantia
          return acc
        }

        acc.push({
          categoria,
          total: 1,
          activos: servicio.estado === "activo" ? 1 : 0,
          ordenes,
          garantia,
        })
        return acc
      }, [])
      .sort((a, b) => b.total - a.total)
  }, [categoriaNameById, filteredServicios, ordersByService])

  const serviceRadar = useMemo(() => {
    return filteredServicios
      .map((servicio) => {
        const ordenes = ordersByService.get(servicio.id) ?? []
        const abiertas = ordenes.filter(
          (orden) => !["completada", "cancelada"].includes(orden.estado)
        )
        const completadas = ordenes.filter((orden) => orden.estado === "completada")
        const atrasadas = abiertas.filter((orden) => {
          if (!orden.fechaProgramada) return false
          return new Date(orden.fechaProgramada).getTime() < today.getTime()
        }).length
        const calificaciones = completadas
          .map((orden) => orden.calificacion)
          .filter((value): value is number => typeof value === "number")
        const promedioCalificacion = calificaciones.length
          ? (calificaciones.reduce((sum, value) => sum + value, 0) / calificaciones.length).toFixed(
              1
            )
          : null
        const facturacionPorMoneda = (invoiceItemsByService.get(servicio.id) ?? []).reduce<
          Record<string, number>
        >((acc, item) => {
          acc[item.moneda] = (acc[item.moneda] ?? 0) + item.total
          return acc
        }, {})

        return {
          servicio,
          abiertas: abiertas.length,
          atrasadas,
          completadas: completadas.length,
          promedioCalificacion,
          facturacionPorMoneda,
          puntaje:
            abiertas.length * 2 +
            atrasadas * 2 +
            (servicio.estado === "inactivo" ? 1 : 0) +
            ((servicio.garantiaDias ?? 0) > 0 ? 1 : 0),
        }
      })
      .sort((a, b) => b.puntaje - a.puntaje || b.abiertas - a.abiertas)
      .slice(0, 6)
  }, [filteredServicios, invoiceItemsByService, ordersByService, today])

  const highlightedService =
    selectedServicio && filteredServicios.some((servicio) => servicio.id === selectedServicio.id)
      ? selectedServicio
      : (filteredServicios[0] ?? null)
  const highlightedOrders = highlightedService
    ? (ordersByService.get(highlightedService.id) ?? [])
    : []
  const highlightedBilling = highlightedService
    ? (invoiceItemsByService.get(highlightedService.id) ?? []).reduce<Record<string, number>>(
        (acc, item) => {
          acc[item.moneda] = (acc[item.moneda] ?? 0) + item.total
          return acc
        },
        {}
      )
    : {}

  const openForm = (servicio?: HDServicio) => {
    if (servicio) {
      setSelectedServicioId(servicio.id)
      setFormData({
        codigo: servicio.codigo,
        nombre: servicio.nombre,
        descripcion: servicio.descripcion || "",
        categoriaId: servicio.categoriaId,
        duracionEstimada: servicio.duracionEstimada,
        precioBase: servicio.precioBase,
        tipoPrecio: servicio.tipoPrecio,
        garantiaDias: servicio.garantiaDias || 0,
        condiciones: servicio.condiciones || "",
        estado: servicio.estado,
      })
    } else {
      setSelectedServicioId(null)
      setFormData({
        codigo: `SRV-${String(serviciosList.length + 1).padStart(3, "0")}`,
        nombre: "",
        descripcion: "",
        categoriaId: "",
        duracionEstimada: 60,
        precioBase: 0,
        tipoPrecio: "mensual",
        garantiaDias: 0,
        condiciones: "",
        estado: "activo",
      })
    }
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setSelectedServicioId(null)
    router.push("/helpdesk/servicios")
  }

  const handleSave = async () => {
    if (selectedServicio) {
      await updateServicio(selectedServicio.id, formData)
    } else {
      await createServicio(formData as Omit<HDServicio, "id" | "createdAt" | "updatedAt">)
    }
    closeForm()
  }

  const handleDelete = async () => {
    if (selectedServicio) {
      await deleteServicio(selectedServicio.id)
      setIsDeleteOpen(false)
      setSelectedServicioId(null)
    }
  }

  const getCategoriaName = (categoriaId: string) => {
    return categoriaNameById.get(categoriaId) ?? getCategoriaLabel(categoriaId)
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
  }

  const formatPrice = (price: number, tipo: string) => {
    const formatted = price.toLocaleString("es-AR", { style: "currency", currency: "USD" })
    switch (tipo) {
      case "mensual":
        return `${formatted}/mes`
      case "evento":
        return `${formatted}/evento`
      case "por_hora":
        return `${formatted}/hora`
      case "por_proyecto":
        return `${formatted} (proyecto)`
      default:
        return formatted
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Catalogo de Servicios</h1>
          <p className="text-muted-foreground">
            Administra y prioriza servicios con demanda, garantia y facturacion visibles
          </p>
        </div>
        <Button onClick={() => openForm()}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Servicio
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por codigo o nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterCategoria} onValueChange={setFilterCategoria}>
              <SelectTrigger className="w-full md:w-50">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas las categorias</SelectItem>
                {categoriaOptions.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="w-full md:w-37.5">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="inactivo">Inactivo</SelectItem>
              </SelectContent>
            </Select>
            {(filterCategoria !== "todos" || filterEstado !== "todos") && (
              <Button
                variant="ghost"
                onClick={() => {
                  setFilterCategoria("todos")
                  setFilterEstado("todos")
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Servicios visibles</CardDescription>
            <CardTitle className="text-2xl">{summary.visibles}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {summary.activos} activos en la vista actual
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Con ordenes abiertas</CardDescription>
            <CardTitle className="text-2xl">{summary.conOrdenesAbiertas}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Servicios con trabajo operativo pendiente
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Con garantia</CardDescription>
            <CardTitle className="text-2xl">{summary.conGarantia}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Cobertura post-servicio visible en el contrato
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Con facturacion asociada</CardDescription>
            <CardTitle className="text-2xl">{summary.conFacturacion}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Servicios presentes en items ya facturados
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Radar de demanda</CardTitle>
            <CardDescription>
              Prioriza servicios con ordenes abiertas, agenda vencida y calificacion real cuando
              existe.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {serviceRadar.length > 0 ? (
              serviceRadar.map((entry) => (
                <div key={entry.servicio.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{entry.servicio.nombre}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {getCategoriaName(entry.servicio.categoriaId)} ·{" "}
                        {getTipoPrecioLabel(entry.servicio.tipoPrecio)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        entry.atrasadas > 0
                          ? "destructive"
                          : entry.abiertas > 0
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {entry.abiertas} abiertas
                    </Badge>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Agenda vencida</p>
                      <p className="mt-1 font-medium">{entry.atrasadas}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Completadas</p>
                      <p className="mt-1 font-medium">{entry.completadas}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Calificación</p>
                      <p className="mt-1 font-medium">
                        {entry.promedioCalificacion ?? "Sin feedback"}
                      </p>
                    </div>
                  </div>

                  {Object.keys(entry.facturacionPorMoneda).length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {Object.entries(entry.facturacionPorMoneda).map(([moneda, total]) => (
                        <Badge key={moneda} variant="outline">
                          {moneda} {total.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-muted-foreground">
                      Sin items facturados visibles.
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No hay servicios visibles para construir el radar operativo.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Servicio destacado</CardTitle>
            <CardDescription>
              Resumen contractual y operativo del primer servicio visible o seleccionado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {highlightedService ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{highlightedService.nombre}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {getCategoriaName(highlightedService.categoriaId)}
                    </p>
                  </div>
                  <Badge variant={highlightedService.estado === "activo" ? "default" : "secondary"}>
                    {highlightedService.estado}
                  </Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Duración estimada</p>
                    <p className="mt-2 font-medium">
                      {formatDuration(highlightedService.duracionEstimada)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Precio base</p>
                    <p className="mt-2 font-medium">
                      {formatPrice(highlightedService.precioBase, highlightedService.tipoPrecio)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Órdenes vinculadas</p>
                    <p className="mt-2 font-medium">{highlightedOrders.length}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Garantía</p>
                    <p className="mt-2 font-medium">
                      {highlightedService.garantiaDias
                        ? `${highlightedService.garantiaDias} días`
                        : "Sin garantía"}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/20 p-4">
                  <p className="text-sm text-muted-foreground">Facturación visible por moneda</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.keys(highlightedBilling).length > 0 ? (
                      Object.entries(highlightedBilling).map(([moneda, total]) => (
                        <Badge key={moneda} variant="outline">
                          {moneda} {total.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Sin facturación asociada en los datos actuales.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
                  La pantalla usa sólo catálogo, órdenes y facturas visibles. Agenda granular por
                  técnico, costos reales de recursos y forecast contractual siguen fuera del backend
                  actual.
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No hay servicios visibles para construir el resumen destacado.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cobertura por categoría</CardTitle>
          <CardDescription>
            Reparto del catálogo visible entre activación, demanda y garantía publicada.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {categoryCoverage.length > 0 ? (
            categoryCoverage.map((category) => (
              <div key={category.categoria} className="rounded-lg border p-4">
                <p className="font-medium">{category.categoria}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {category.total} servicios visibles
                </p>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-muted-foreground">Activos</p>
                    <p className="font-medium">{category.activos}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Órdenes</p>
                    <p className="font-medium">{category.ordenes}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Garantía</p>
                    <p className="font-medium">{category.garantia}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              No hay categorías visibles para resumir.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codigo</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Duracion Est.</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Garantia</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredServicios.map((servicio) => (
                <TableRow key={servicio.id} className="group">
                  <TableCell className="font-mono text-xs">{servicio.codigo}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{servicio.nombre}</p>
                      {servicio.descripcion && (
                        <p className="max-w-50 truncate text-xs text-muted-foreground">
                          {servicio.descripcion}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getCategoriaName(servicio.categoriaId)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {formatDuration(servicio.duracionEstimada)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-muted-foreground" />
                      {formatPrice(servicio.precioBase, servicio.tipoPrecio)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {servicio.garantiaDias ? `${servicio.garantiaDias} dias` : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={servicio.estado === "activo" ? "default" : "secondary"}>
                      {servicio.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openForm(servicio)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedServicioId(servicio.id)
                            setIsDeleteOpen(true)
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredServicios.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No se encontraron servicios
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Formulario */}
      <Dialog open={isFormOpen} onOpenChange={(open) => (open ? setIsFormOpen(true) : closeForm())}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedServicio ? "Editar Servicio" : "Nuevo Servicio"}</DialogTitle>
            <DialogDescription>
              {selectedServicio
                ? "Modifica los datos del servicio"
                : "Complete los datos del nuevo servicio"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="codigo">Codigo</Label>
                <Input
                  id="codigo"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="categoriaId">Categoria *</Label>
                <Select
                  value={formData.categoriaId}
                  onValueChange={(v) => setFormData({ ...formData, categoriaId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriaOptions.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="descripcion">Descripcion</Label>
              <Textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="duracionEstimada">Duracion Estimada (min)</Label>
                <Input
                  id="duracionEstimada"
                  type="number"
                  value={formData.duracionEstimada}
                  onChange={(e) =>
                    setFormData({ ...formData, duracionEstimada: Number(e.target.value) })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="garantiaDias">Garantia (dias)</Label>
                <Input
                  id="garantiaDias"
                  type="number"
                  value={formData.garantiaDias}
                  onChange={(e) =>
                    setFormData({ ...formData, garantiaDias: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="precioBase">Precio Base (USD)</Label>
                <Input
                  id="precioBase"
                  type="number"
                  value={formData.precioBase}
                  onChange={(e) => setFormData({ ...formData, precioBase: Number(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tipoPrecio">Tipo de Precio</Label>
                <Select
                  value={formData.tipoPrecio}
                  onValueChange={(v) =>
                    setFormData({ ...formData, tipoPrecio: v as HDServicio["tipoPrecio"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensual">Mensual</SelectItem>
                    <SelectItem value="evento">Por Evento</SelectItem>
                    <SelectItem value="fijo">Precio Fijo</SelectItem>
                    <SelectItem value="por_hora">Por Hora</SelectItem>
                    <SelectItem value="por_proyecto">Por Proyecto</SelectItem>
                    <SelectItem value="escalonado">Escalonado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="estado">Estado</Label>
              <Select
                value={formData.estado}
                onValueChange={(v) =>
                  setFormData({ ...formData, estado: v as HDServicio["estado"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="inactivo">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!formData.nombre || !formData.categoriaId}>
              {selectedServicio ? "Guardar cambios" : "Crear servicio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog Eliminar */}
      <AlertDialog
        open={isDeleteOpen && !!selectedServicio}
        onOpenChange={(open) => {
          setIsDeleteOpen(open)
          if (!open) {
            setSelectedServicioId(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar servicio</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. Se eliminara permanentemente el servicio{" "}
              <strong>{selectedServicio?.nombre}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default function ServiciosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Cargando...
        </div>
      }
    >
      <ServiciosContent />
    </Suspense>
  )
}
