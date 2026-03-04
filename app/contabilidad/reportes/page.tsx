import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Download, TrendingUp, TrendingDown } from "lucide-react"

const reports = [
  {
    title: "Balance General",
    description: "Estado de situacion financiera",
    lastGenerated: "2024-01-15",
  },
  {
    title: "Estado de Resultados",
    description: "Perdidas y ganancias del periodo",
    lastGenerated: "2024-01-15",
  },
  {
    title: "Libro Mayor",
    description: "Movimientos por cuenta contable",
    lastGenerated: "2024-01-14",
  },
  {
    title: "Libro Diario",
    description: "Registro cronologico de asientos",
    lastGenerated: "2024-01-14",
  },
  {
    title: "Balance de Comprobacion",
    description: "Sumas y saldos de cuentas",
    lastGenerated: "2024-01-13",
  },
  {
    title: "Flujo de Efectivo",
    description: "Movimientos de caja y bancos",
    lastGenerated: "2024-01-12",
  },
]

const summary = [
  { label: "Activos Totales", value: 125000, trend: "up", change: "+5.2%" },
  { label: "Pasivos Totales", value: 45000, trend: "down", change: "-2.1%" },
  { label: "Patrimonio", value: 80000, trend: "up", change: "+8.5%" },
  { label: "Utilidad Neta", value: 53000, trend: "up", change: "+12.3%" },
]

export default function ReportesContablesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reportes Financieros</h1>
        <p className="text-muted-foreground">
          Genera y descarga estados financieros y reportes contables.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summary.map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${item.value.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {item.trend === "up" ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span className={item.trend === "up" ? "text-green-500" : "text-red-500"}>
                  {item.change}
                </span>
                {" "}vs mes anterior
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reports Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Reportes Disponibles</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <Card key={report.title}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-base">{report.title}</CardTitle>
                      <CardDescription className="text-xs">{report.description}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Generado: {report.lastGenerated}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Ver
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
