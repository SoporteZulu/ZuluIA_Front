import { VentasNotasPage } from "../notas-credito/page"

export default function NotasDebitoPage() {
  return (
    <VentasNotasPage
      defaultKind="debito"
      pageTitle="Notas de Débito"
      pageDescription="Recargos, diferencias y reimputaciones comerciales con emisión real sobre el circuito documental de ventas."
    />
  )
}
