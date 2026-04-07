"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { isAuthConfigured, login } from "@/lib/auth"

const accessHighlights = [
  {
    title: "Operación unificada",
    description: "Entrá a ventas, compras, contabilidad, CRM y logística desde una sola sesión.",
  },
  {
    title: "Lectura operativa real",
    description:
      "Los tableros reflejan contratos y métricas visibles hoy, sin simular circuitos no publicados.",
  },
  {
    title: "Acceso seguro",
    description:
      "La autenticación usa el backend configurado con token persistido para la sesión activa.",
  },
]

export default function LoginPage() {
  const router = useRouter()
  const [userName, setUserName] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmedUserName = userName.trim()
  const hasCredentials = trimmedUserName.length > 0 && password.length > 0
  const envConfigured = isAuthConfigured()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!hasCredentials) {
      setError("Completá usuario y contraseña para iniciar sesión.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      await login(trimmedUserName, password)
      router.replace("/")
    } catch (submissionError) {
      setError(
        submissionError instanceof Error ? submissionError.message : "Error al iniciar sesión"
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.16),transparent_34%),linear-gradient(180deg,rgba(241,245,249,0.92),rgba(255,255,255,1))] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-4xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur sm:p-8 lg:p-10">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-cyan-600 to-sky-800 text-xl font-bold text-white shadow-lg shadow-cyan-950/20">
              Z
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-700">
                ZULU ERP
              </p>
              <p className="text-sm text-muted-foreground">
                Entrada operativa al ecosistema comercial y administrativo.
              </p>
            </div>
          </div>

          <div className="mt-8 max-w-2xl space-y-4">
            <Badge variant="outline" className="border-cyan-200 bg-cyan-50 text-cyan-900">
              Acceso centralizado
            </Badge>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Ingresá a la operación sin perder contexto del negocio.
            </h1>
            <p className="max-w-xl text-base leading-7 text-slate-600">
              Esta pantalla concentra el acceso a los módulos que ya exponen cartera, riesgo,
              ejecución y cobertura sobre contratos reales del sistema.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {accessHighlights.map((highlight) => (
              <Card key={highlight.title} className="border-slate-200 bg-slate-50/80 shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{highlight.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-muted-foreground">{highlight.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-950 px-5 py-4 text-slate-50 shadow-xl shadow-slate-950/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-200">Estado del acceso</p>
                <h2 className="mt-1 text-xl font-semibold">Preparación del entorno</h2>
              </div>
              <Badge
                variant="secondary"
                className={
                  envConfigured
                    ? "bg-emerald-500/15 text-emerald-200"
                    : "bg-amber-500/15 text-amber-100"
                }
              >
                {envConfigured ? "Configurado" : "Revisar variables"}
              </Badge>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              El inicio de sesión depende de la API local y del flujo vigente de contraseña. Si el
              entorno no está configurado, la autenticación no puede completarse desde esta
              pantalla.
            </p>
          </div>
        </section>

        <Card className="overflow-hidden border-slate-200 bg-white shadow-xl shadow-slate-200/60">
          <CardHeader className="space-y-4 bg-slate-50/70 p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-800">
                  <LockKeyhole className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-semibold">Iniciar sesión</CardTitle>
                  <CardDescription>
                    Usá tus credenciales activas para acceder al tablero principal.
                  </CardDescription>
                </div>
              </div>
              <Badge variant={envConfigured ? "secondary" : "destructive"}>
                {envConfigured ? "Auth lista" : "Auth pendiente"}
              </Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Sesión protegida
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  El token se persiste localmente después de autenticarse con el flujo actual.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                  <CheckCircle2 className="h-4 w-4 text-cyan-700" />
                  Requisitos mínimos
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Usuario, contraseña y backend configurado.
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {!envConfigured ? (
                <Alert className="border-amber-200 bg-amber-50 text-amber-950">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Configuración incompleta</AlertTitle>
                  <AlertDescription>
                    Falta `NEXT_PUBLIC_API_URL`. El acceso va a fallar hasta que la URL del backend
                    esté disponible.
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="userName">Usuario</Label>
                <Input
                  id="userName"
                  type="text"
                  placeholder="admin.local"
                  value={userName}
                  onChange={(event) => setUserName(event.target.value)}
                  required
                  autoComplete="username"
                  autoFocus
                  disabled={loading}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="password">Contraseña</Label>
                  <span className="text-xs text-muted-foreground">
                    Autenticación por contraseña vigente
                  </span>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    autoComplete="current-password"
                    disabled={loading}
                    className="h-11 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((currentValue) => !currentValue)}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No se pudo iniciar la sesión</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <Button
                type="submit"
                className="h-11 w-full text-sm font-medium"
                disabled={loading || !hasCredentials}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validando acceso...
                  </>
                ) : (
                  <>
                    Entrar al sistema
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <Separator />

              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Si recibís un error de credenciales, verificá tu usuario local activo. Si recibís
                  un error de configuración, revisá la URL pública del backend local.
                </p>
                <p>
                  Esta pantalla no expone recuperación, SSO ni selección de tenant porque esos
                  flujos no están publicados en el contrato actual.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
