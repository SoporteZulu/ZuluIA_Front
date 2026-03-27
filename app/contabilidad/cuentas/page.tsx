"use client"

import { useEffect, useMemo, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
import { useAsientos, usePlanCuentasAll } from "@/lib/hooks/useAsientos"
import { useEjercicioVigente } from "@/lib/hooks/useEjercicios"
import { useDefaultSucursalId } from "@/lib/hooks/useSucursales"
import type { PlanCuenta } from "@/lib/types/asientos"
import {
  AlertCircle,
  ClipboardList,
  FolderTree,
  Plus,
  RefreshCcw,
  Scale,
  Search,
  Waypoints,
  Wallet,
} from "lucide-react"

type AccountMovement = {
  asientoId: number
  numero: number | string | null | undefined
  fecha: string
  descripcion: string
  estado: string
  debe: number
  haber: number
  observacion: string | null
}

function fmtARS(value: number) {
  return Number(value ?? 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleDateString("es-AR") : "-"
}

function formatDateTime(value?: string) {
  return value
    ? new Date(value).toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-"
}

function getMovementStatus(movement?: AccountMovement | null) {
  if (!movement) {
    return {
      label: "Sin actividad visible",
      detail:
        "No hay líneas recientes detectadas para la cuenta dentro del lote de asientos visible.",
    }
  }

  if (movement.estado.toLowerCase() === "publicado") {
    return {
      label: "Publicado",
      detail: "La última imputación visible pertenece a un asiento consolidado.",
    }
  }

  return {
    label: movement.estado,
    detail: "La actividad más reciente todavía no está consolidada como asiento publicado.",
  }
}

function getAccountCircuit(account: PlanCuenta) {
  if (account.imputable) {
    return {
      label: "Opera en asientos",
      detail: "La cuenta admite registración directa de movimientos contables.",
    }
  }

  return {
    label: "Integradora",
    detail: "La cuenta ordena el árbol y resume saldos de niveles inferiores.",
  }
}

function DetailFieldGrid({ fields }: { fields: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map((field) => (
        <div key={field.label} className="rounded-lg border p-3">
          <p className="text-sm text-muted-foreground">{field.label}</p>
          <p className="mt-2 font-medium">{field.value}</p>
        </div>
      ))}
    </div>
  )
}

function getTypeBadge(type: string | null) {
  if (!type) return <Badge variant="secondary">Sin tipo</Badge>

  const colors: Record<string, string> = {
    activo: "bg-blue-500/10 text-blue-600",
    pasivo: "bg-red-500/10 text-red-600",
    patrimonio: "bg-emerald-500/10 text-emerald-600",
    ingreso: "bg-green-500/10 text-green-600",
    gasto: "bg-orange-500/10 text-orange-600",
  }

  const lower = type.toLowerCase()
  const className = Object.entries(colors).find(([key]) => lower.includes(key))?.[1] ?? ""

  return (
    <Badge variant="secondary" className={className}>
      {type}
    </Badge>
  )
}

function SummaryCard({
  title,
  value,
  description,
}: {
  title: string
  value: string
  description: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function getIndentClass(level: number) {
  if (level <= 1) return "font-semibold"
  if (level === 2) return "pl-4 font-medium"
  if (level === 3) return "pl-8"
  return "pl-12"
}

export default function CuentasPage() {
  const sucursalId = useDefaultSucursalId() ?? 1
  const { ejercicio } = useEjercicioVigente()
  const { cuentas, loading, error, refetch } = usePlanCuentasAll(ejercicio?.id)
  const {
    asientos,
    totalCount: totalAsientos,
    loading: loadingAsientos,
    error: errorAsientos,
    getById,
  } = useAsientos({ ejercicioId: ejercicio?.id, sucursalId })

  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [scopeFilter, setScopeFilter] = useState("all")
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [movements, setMovements] = useState<AccountMovement[]>([])

  const accountTypes = useMemo(
    () => Array.from(new Set(cuentas.map((cuenta) => cuenta.tipo).filter(Boolean))) as string[],
    [cuentas]
  )

  const filteredAccounts = useMemo(() => {
    const term = search.trim().toLowerCase()

    return cuentas.filter((cuenta) => {
      const matchesSearch =
        !term ||
        cuenta.denominacion.toLowerCase().includes(term) ||
        cuenta.codigoCuenta.toLowerCase().includes(term)
      const matchesType = typeFilter === "all" || cuenta.tipo === typeFilter
      const matchesScope =
        scopeFilter === "all" ||
        (scopeFilter === "imputables" && cuenta.imputable) ||
        (scopeFilter === "integradoras" && !cuenta.imputable)

      return matchesSearch && matchesType && matchesScope
    })
  }, [cuentas, scopeFilter, search, typeFilter])

  const selectedAccount = useMemo(
    () => filteredAccounts.find((cuenta) => cuenta.id === selectedAccountId) ?? null,
    [filteredAccounts, selectedAccountId]
  )

  const imputables = cuentas.filter((cuenta) => cuenta.imputable).length
  const integradoras = cuentas.length - imputables
  const highestLevel = cuentas.reduce((max, cuenta) => Math.max(max, cuenta.nivel), 0)

  useEffect(() => {
    if (!filteredAccounts.length) {
      setSelectedAccountId(null)
      return
    }

    if (!selectedAccountId || !filteredAccounts.some((cuenta) => cuenta.id === selectedAccountId)) {
      setSelectedAccountId(filteredAccounts[0].id)
    }
  }, [filteredAccounts, selectedAccountId])

  useEffect(() => {
    let cancelled = false

    const loadMovements = async (account: PlanCuenta) => {
      setDetailLoading(true)
      setDetailError(null)

      try {
        const recentEntries = [...asientos]
          .sort((a, b) => `${b.fecha}-${b.id}`.localeCompare(`${a.fecha}-${a.id}`))
          .slice(0, 20)

        const details = await Promise.all(recentEntries.map((entry) => getById(entry.id)))
        const nextMovements = details
          .flatMap((detail) => {
            if (!detail) return []

            return detail.lineas
              .filter((linea) => linea.cuentaId === account.id)
              .map((linea) => ({
                asientoId: detail.id,
                numero: detail.numero,
                fecha: detail.fecha,
                descripcion: detail.descripcion,
                estado: detail.estado,
                debe: Number(linea.debe ?? 0),
                haber: Number(linea.haber ?? 0),
                observacion: linea.observacion,
              }))
          })
          .sort((a, b) => `${b.fecha}-${b.asientoId}`.localeCompare(`${a.fecha}-${a.asientoId}`))

        if (!cancelled) {
          setMovements(nextMovements)
        }
      } catch {
        if (!cancelled) {
          setDetailError(
            "No se pudieron recuperar movimientos recientes para la cuenta seleccionada."
          )
          setMovements([])
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false)
        }
      }
    }

    if (selectedAccount) loadMovements(selectedAccount)
    else setMovements([])

    return () => {
      cancelled = true
    }
  }, [asientos, getById, selectedAccount])

  const totalDebeVisible = movements.reduce((sum, movement) => sum + movement.debe, 0)
  const totalHaberVisible = movements.reduce((sum, movement) => sum + movement.haber, 0)
  const saldoVisible = totalDebeVisible - totalHaberVisible
  const lastMovement = movements[0] ?? null
  const accountCircuit = selectedAccount ? getAccountCircuit(selectedAccount) : null
  const movementStatus = getMovementStatus(lastMovement)
  const cuentasImputablesFiltradas = filteredAccounts.filter((cuenta) => cuenta.imputable).length

  const clearFilters = () => {
    setSearch("")
    setTypeFilter("all")
    setScopeFilter("all")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plan de Cuentas</h1>
          <p className="text-muted-foreground">
            Consola operativa del catálogo contable con filtros reales del ejercicio y lectura de
            movimientos detectados en los asientos visibles del backend.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={refetch} disabled={loading}>
            <RefreshCcw className="h-4 w-4" />
            Actualizar
          </Button>
          <Button disabled>
            <Plus className="h-4 w-4" />
            Nueva Cuenta
          </Button>
        </div>
      </div>

      <Alert>
        <Wallet className="h-4 w-4" />
        <AlertDescription>
          El backend actual expone consulta completa del plan de cuentas y análisis de asientos,
          pero todavía no ofrece altas o ediciones dedicadas para esta pantalla. Por eso se evita
          simular ABM que aún no existe.
        </AlertDescription>
      </Alert>

      {(error || errorAsientos || detailError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{detailError || errorAsientos || error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Cuentas totales"
          value={String(cuentas.length)}
          description={`Ejercicio ${ejercicio?.descripcion ?? "sin definir"}.`}
        />
        <SummaryCard
          title="Imputables"
          value={String(imputables)}
          description="Cuentas listas para registrar líneas de asiento."
        />
        <SummaryCard
          title="Integradoras"
          value={String(integradoras)}
          description={`Nivel jerárquico máximo detectado: ${highestLevel}.`}
        />
        <SummaryCard
          title="Asientos visibles"
          value={loadingAsientos ? "..." : String(totalAsientos)}
          description={`Sucursal ${sucursalId}; base usada para el análisis reciente.`}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4" /> Cobertura del catálogo
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {filteredAccounts.length} cuentas visibles y {cuentasImputablesFiltradas} imputables
            dentro de la selección actual.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Waypoints className="h-4 w-4" /> Circuito de la cuenta
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {accountCircuit?.detail ??
              "Seleccioná una cuenta para leer su rol dentro del plan contable."}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Scale className="h-4 w-4" /> Lectura reciente
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {movementStatus.detail}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros del catálogo</CardTitle>
          <CardDescription>
            Refiná por código, denominación, tipo o naturaleza para trabajar el árbol contable sin
            placeholders.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_220px_220px_auto]">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar por código o denominación..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {accountTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={scopeFilter} onValueChange={setScopeFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todas las naturalezas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Imputables e integradoras</SelectItem>
                <SelectItem value="imputables">Solo imputables</SelectItem>
                <SelectItem value="integradoras">Solo integradoras</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={clearFilters}>
              Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FolderTree className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Estructura del plan</CardTitle>
            </div>
            <CardDescription>
              {filteredAccounts.length} cuentas en la vista actual. Seleccioná una fila para revisar
              su actividad reciente.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Nivel</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Circuito</TableHead>
                  <TableHead>Saldo normal</TableHead>
                  <TableHead>Clase</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      Cargando plan de cuentas...
                    </TableCell>
                  </TableRow>
                )}
                {!loading && !error && filteredAccounts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      No hay cuentas para los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  !error &&
                  filteredAccounts.map((cuenta) => {
                    const isSelected = cuenta.id === selectedAccountId

                    return (
                      <TableRow
                        key={cuenta.id}
                        className={isSelected ? "bg-accent/40" : undefined}
                        onClick={() => setSelectedAccountId(cuenta.id)}
                      >
                        <TableCell className="font-mono text-sm">{cuenta.codigoCuenta}</TableCell>
                        <TableCell className={getIndentClass(cuenta.nivel)}>
                          {cuenta.denominacion}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {cuenta.nivel}
                        </TableCell>
                        <TableCell>{getTypeBadge(cuenta.tipo)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {getAccountCircuit(cuenta).label}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {cuenta.saldoNormal ?? "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={cuenta.imputable ? "default" : "secondary"}>
                            {cuenta.imputable ? "Imputable" : "Integradora"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selectedAccount ? selectedAccount.denominacion : "Detalle de cuenta"}
            </CardTitle>
            <CardDescription>
              {selectedAccount
                ? `${selectedAccount.codigoCuenta} · análisis construido sobre los últimos asientos visibles.`
                : "Seleccioná una cuenta para revisar su contexto operativo."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedAccount ? (
              <>
                <DetailFieldGrid
                  fields={[
                    { label: "Código", value: selectedAccount.codigoCuenta },
                    { label: "Nivel", value: String(selectedAccount.nivel) },
                    { label: "Tipo", value: selectedAccount.tipo ?? "Sin tipo" },
                    { label: "Saldo normal", value: selectedAccount.saldoNormal ?? "No informado" },
                    {
                      label: "Clase",
                      value: selectedAccount.imputable ? "Imputable" : "Integradora",
                    },
                    { label: "Circuito", value: accountCircuit?.label ?? "-" },
                    { label: "Orden nivel", value: selectedAccount.ordenNivel ?? "No informada" },
                    {
                      label: "Último movimiento",
                      value: lastMovement ? formatDateTime(lastMovement.fecha) : "Sin datos",
                    },
                  ]}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Movimientos visibles</p>
                    <p className="mt-2 text-xl font-semibold">{movements.length}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Último movimiento</p>
                    <p className="mt-2 text-xl font-semibold">
                      {lastMovement ? formatDate(lastMovement.fecha) : "Sin datos"}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Debe visible</p>
                    <p className="mt-2 text-xl font-semibold">${fmtARS(totalDebeVisible)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Saldo visible</p>
                    <p className="mt-2 text-xl font-semibold">${fmtARS(saldoVisible)}</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Estado del último asiento</p>
                    <p className="mt-2 font-medium">{movementStatus.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{movementStatus.detail}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Balance visible</p>
                    <p className="mt-2 font-medium">
                      {saldoVisible === 0 ? "Compensado" : saldoVisible > 0 ? "Deudor" : "Acreedor"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Debe ${fmtARS(totalDebeVisible)} · Haber ${fmtARS(totalHaberVisible)}
                    </p>
                  </div>
                </div>

                {detailLoading ? (
                  <p className="text-sm text-muted-foreground">Cargando movimientos recientes...</p>
                ) : movements.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No se detectaron líneas para esta cuenta dentro de los últimos asientos
                    visibles.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {movements.slice(0, 8).map((movement) => (
                      <div
                        key={`${movement.asientoId}-${movement.fecha}-${movement.debe}-${movement.haber}`}
                        className="rounded-lg border p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{movement.descripcion}</p>
                            <p className="text-sm text-muted-foreground">
                              Asiento #{movement.numero ?? movement.asientoId} ·{" "}
                              {formatDate(movement.fecha)}
                            </p>
                          </div>
                          <Badge
                            variant={
                              movement.estado.toLowerCase() === "publicado"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {movement.estado}
                          </Badge>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <p className="text-sm">
                            Debe: <span className="font-mono">${fmtARS(movement.debe)}</span>
                          </p>
                          <p className="text-sm">
                            Haber: <span className="font-mono">${fmtARS(movement.haber)}</span>
                          </p>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {movement.debe > 0
                            ? "Impacta como débito en la cuenta seleccionada."
                            : movement.haber > 0
                              ? "Impacta como crédito en la cuenta seleccionada."
                              : "Sin impacto monetario visible en esta línea."}
                        </p>
                        {movement.observacion && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {movement.observacion}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No hay una cuenta seleccionada en la vista actual.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
