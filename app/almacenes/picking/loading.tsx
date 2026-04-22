import { WmsPageLoading } from "@/components/almacenes/wms-loading"

export default function Loading() {
  return (
    <WmsPageLoading
      badge="Picking WMS"
      title="Cargando picking"
      description="Preparando órdenes de preparación, trazabilidad y acciones del circuito de despacho."
    />
  )
}
