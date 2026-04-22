import { WmsPageLoading } from "@/components/almacenes/wms-loading"

export default function Loading() {
  return (
    <WmsPageLoading
      badge="Recepciones WMS"
      title="Cargando recepciones"
      description="Preparando órdenes abiertas, detalle documental y el circuito real de ingreso."
    />
  )
}
