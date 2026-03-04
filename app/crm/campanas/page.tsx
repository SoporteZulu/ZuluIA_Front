"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Plus, Search, Pencil, Trash2, Megaphone, Target, Users, TrendingUp, X, DollarSign } from "lucide-react"
import { crmCampaigns, crmSegments, crmUsers, type CRMCampaign } from "@/lib/crm-data"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import Loading from "./loading"

const tipoCampanaLabels: Record<string, string> = {
  email: "Email Marketing",
  evento: "Evento",
  llamadas: "Llamadas",
  redes_sociales: "Redes Sociales",
  publicidad: "Publicidad",
}

const objetivoLabels: Record<string, string> = {
  generacion_leads: "Generación de Leads",
  upselling: "Upselling",
  fidelizacion: "Fidelización",
  recuperacion: "Recuperación",
  branding: "Branding",
}

const estadoColors: Record<string, string> = {
  borrador: "bg-gray-500/20 text-gray-400",
  activa: "bg-green-500/20 text-green-400",
  pausada: "bg-yellow-500/20 text-yellow-400",
  completada: "bg-blue-500/20 text-blue-400",
}

export default function CampanasPage() {
  const searchParams = useSearchParams()
  const [campaigns, setCampaigns] = useState<CRMCampaign[]>(crmCampaigns)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterTipo, setFilterTipo] = useState<string>("todos")
  const [filterEstado, setFilterEstado] = useState<string>("todos")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<CRMCampaign | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    nombre: "",
    tipoCampana: "email" as CRMCampaign["tipoCampana"],
    objetivo: "generacion_leads" as CRMCampaign["objetivo"],
    segmentoObjetivoId: "",
    fechaInicio: "",
    fechaFin: "",
    presupuestoEstimado: 0,
    presupuestoGastado: 0,
    responsableId: "",
    notas: "",
    leadsGenerados: 0,
    oportunidadesGeneradas: 0,
    negociosGanados: 0,
  })

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((campaign) => {
      const matchesSearch = campaign.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesTipo = filterTipo === "todos" || campaign.tipoCampana === filterTipo
      const matchesEstado = filterEstado === "todos" || campaign.status === filterEstado
      return matchesSearch && matchesTipo && matchesEstado
    })
  }, [campaigns, searchTerm, filterTipo, filterEstado])

  const stats = useMemo(() => {
    const activas = campaigns.filter((c) => c.status === "activa").length
    const totalLeads = campaigns.reduce((sum, c) => sum + c.leadsGenerados, 0)
    const totalPresupuesto = campaigns.reduce((sum, c) => sum + c.presupuestoEstimado, 0)
    const totalGastado = campaigns.reduce((sum, c) => sum + c.presupuestoGastado, 0)
    return { activas, totalLeads, totalPresupuesto, totalGastado }
  }, [campaigns])

  const hasActiveFilters = filterTipo !== "todos" || filterEstado !== "todos" || searchTerm !== ""

  const resetForm = () => {
    setFormData({
      nombre: "",
      tipoCampana: "email",
      objetivo: "generacion_leads",
      segmentoObjetivoId: "",
      fechaInicio: "",
      fechaFin: "",
      presupuestoEstimado: 0,
      presupuestoGastado: 0,
      responsableId: "",
      notas: "",
      leadsGenerados: 0,
      oportunidadesGeneradas: 0,
      negociosGanados: 0,
    })
    setEditingCampaign(null)
  }

  const handleEdit = (campaign: CRMCampaign) => {
    setEditingCampaign(campaign)
    setFormData({
      nombre: campaign.nombre,
      tipoCampana: campaign.tipoCampana,
      objetivo: campaign.objetivo,
      segmentoObjetivoId: campaign.segmentoObjetivoId || "",
      fechaInicio: campaign.fechaInicio.toISOString().split("T")[0],
      fechaFin: campaign.fechaFin?.toISOString().split("T")[0] || "",
      presupuestoEstimado: campaign.presupuestoEstimado,
      presupuestoGastado: campaign.presupuestoGastado,
      responsableId: campaign.responsableId || "",
      notas: campaign.notas || "",
      leadsGenerados: campaign.leadsGenerados,
      oportunidadesGeneradas: campaign.oportunidadesGeneradas,
      negociosGanados: campaign.negociosGanados,
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = () => {
    if (editingCampaign) {
      setCampaigns(
        campaigns.map((c) =>
          c.id === editingCampaign.id
            ? {
                ...c,
                ...formData,
                fechaInicio: new Date(formData.fechaInicio),
                fechaFin: formData.fechaFin ? new Date(formData.fechaFin) : undefined,
                updatedAt: new Date(),
              }
            : c
        )
      )
    } else {
      const newCampaign: CRMCampaign = {
        id: `camp-${Date.now()}`,
        ...formData,
        fechaInicio: new Date(formData.fechaInicio),
        fechaFin: formData.fechaFin ? new Date(formData.fechaFin) : undefined,
        status: "borrador",
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      setCampaigns([newCampaign, ...campaigns])
    }
    setIsDialogOpen(false)
    resetForm()
  }

  const handleDelete = () => {
    if (deleteId) {
      setCampaigns(campaigns.filter((c) => c.id !== deleteId))
      setDeleteId(null)
    }
  }

  const getUserName = (id?: string) => {
    if (!id) return "-"
    const user = crmUsers.find((u) => u.id === id)
    return user ? `${user.nombre} ${user.apellido}` : "-"
  }

  const clearFilters = () => {
    setSearchTerm("")
    setFilterTipo("todos")
    setFilterEstado("todos")
  }

  return (
    <Suspense fallback={<Loading />}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Campañas</h1>
            <p className="text-muted-foreground">Gestiona tus campañas de marketing</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Nueva Campaña</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingCampaign ? "Editar Campaña" : "Nueva Campaña"}</DialogTitle>
                <DialogDescription>Complete los datos de la campaña</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground">Información General</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="nombre">Nombre de la Campaña *</Label>
                      <Input id="nombre" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="tipoCampana">Tipo de Campaña</Label>
                      <Select value={formData.tipoCampana} onValueChange={(v) => setFormData({ ...formData, tipoCampana: v as CRMCampaign["tipoCampana"] })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(tipoCampanaLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="objetivo">Objetivo</Label>
                      <Select value={formData.objetivo} onValueChange={(v) => setFormData({ ...formData, objetivo: v as CRMCampaign["objetivo"] })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(objetivoLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground">Fechas y Presupuesto</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fechaInicio">Fecha Inicio *</Label>
                      <Input id="fechaInicio" type="date" value={formData.fechaInicio} onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="fechaFin">Fecha Fin</Label>
                      <Input id="fechaFin" type="date" value={formData.fechaFin} onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="presupuestoEstimado">Presupuesto Estimado</Label>
                      <Input id="presupuestoEstimado" type="number" value={formData.presupuestoEstimado} onChange={(e) => setFormData({ ...formData, presupuestoEstimado: Number(e.target.value) })} />
                    </div>
                    <div>
                      <Label htmlFor="presupuestoGastado">Presupuesto Gastado</Label>
                      <Input id="presupuestoGastado" type="number" value={formData.presupuestoGastado} onChange={(e) => setFormData({ ...formData, presupuestoGastado: Number(e.target.value) })} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-muted-foreground">Asignación</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="segmentoObjetivoId">Segmento Objetivo</Label>
                      <Select value={formData.segmentoObjetivoId} onValueChange={(v) => setFormData({ ...formData, segmentoObjetivoId: v })}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar segmento" /></SelectTrigger>
                        <SelectContent>
                          {crmSegments.map((segment) => (
                            <SelectItem key={segment.id} value={segment.id}>{segment.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="responsableId">Responsable</Label>
                      <Select value={formData.responsableId} onValueChange={(v) => setFormData({ ...formData, responsableId: v })}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar responsable" /></SelectTrigger>
                        <SelectContent>
                          {crmUsers.map((user) => (
                            <SelectItem key={user.id} value={user.id}>{user.nombre} {user.apellido}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {editingCampaign && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Resultados</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="leadsGenerados">Leads Generados</Label>
                        <Input id="leadsGenerados" type="number" value={formData.leadsGenerados} onChange={(e) => setFormData({ ...formData, leadsGenerados: Number(e.target.value) })} />
                      </div>
                      <div>
                        <Label htmlFor="oportunidadesGeneradas">Oportunidades</Label>
                        <Input id="oportunidadesGeneradas" type="number" value={formData.oportunidadesGeneradas} onChange={(e) => setFormData({ ...formData, oportunidadesGeneradas: Number(e.target.value) })} />
                      </div>
                      <div>
                        <Label htmlFor="negociosGanados">Negocios Ganados</Label>
                        <Input id="negociosGanados" type="number" value={formData.negociosGanados} onChange={(e) => setFormData({ ...formData, negociosGanados: Number(e.target.value) })} />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="notas">Notas</Label>
                  <Textarea id="notas" value={formData.notas} onChange={(e) => setFormData({ ...formData, notas: e.target.value })} rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Cancelar</Button>
                <Button onClick={handleSubmit} disabled={!formData.nombre || !formData.fechaInicio}>{editingCampaign ? "Guardar Cambios" : "Crear Campaña"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Campañas Activas</CardTitle>
              <Megaphone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activas}</div>
              <p className="text-xs text-muted-foreground">de {campaigns.length} totales</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Leads Generados</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLeads}</div>
              <p className="text-xs text-muted-foreground">total acumulado</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Presupuesto Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalPresupuesto.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">asignado</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Presupuesto Gastado</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalGastado.toLocaleString()}</div>
              <Progress value={stats.totalPresupuesto > 0 ? (stats.totalGastado / stats.totalPresupuesto) * 100 : 0} className="mt-2 h-2" />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Lista de Campañas</CardTitle>
                <CardDescription>{filteredCampaigns.length} campañas encontradas</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar campaña..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 w-[200px]" />
                </div>
                <Select value={filterTipo} onValueChange={setFilterTipo}>
                  <SelectTrigger className="w-[150px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los tipos</SelectItem>
                    {Object.entries(tipoCampanaLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterEstado} onValueChange={setFilterEstado}>
                  <SelectTrigger className="w-[150px]"><SelectValue placeholder="Estado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los estados</SelectItem>
                    <SelectItem value="borrador">Borrador</SelectItem>
                    <SelectItem value="activa">Activa</SelectItem>
                    <SelectItem value="pausada">Pausada</SelectItem>
                    <SelectItem value="completada">Completada</SelectItem>
                  </SelectContent>
                </Select>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}><X className="mr-1 h-4 w-4" />Limpiar</Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Objetivo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Presupuesto</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.map((campaign) => (
                  <TableRow key={campaign.id} className="group">
                    <TableCell className="font-medium">{campaign.nombre}</TableCell>
                    <TableCell>{tipoCampanaLabels[campaign.tipoCampana]}</TableCell>
                    <TableCell>{objetivoLabels[campaign.objetivo]}</TableCell>
                    <TableCell><Badge className={estadoColors[campaign.status]}>{campaign.status}</Badge></TableCell>
                    <TableCell>
                      <div className="text-sm">
                        ${campaign.presupuestoGastado.toLocaleString()} / ${campaign.presupuestoEstimado.toLocaleString()}
                      </div>
                      <Progress value={campaign.presupuestoEstimado > 0 ? (campaign.presupuestoGastado / campaign.presupuestoEstimado) * 100 : 0} className="mt-1 h-1" />
                    </TableCell>
                    <TableCell>{campaign.leadsGenerados}</TableCell>
                    <TableCell>{getUserName(campaign.responsableId)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(campaign)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(campaign.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar Campaña</AlertDialogTitle>
              <AlertDialogDescription>Esta acción no se puede deshacer. Se eliminará permanentemente la campaña y todos sus datos asociados.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Suspense>
  )
}
