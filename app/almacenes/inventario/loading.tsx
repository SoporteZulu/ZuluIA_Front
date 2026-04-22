import { WmsPageLoading } from "@/components/almacenes/wms-loading"

export default function Loading() {
  return (
    <WmsPageLoading
      badge="Inventario WMS"
      title="Cargando inventario"
      description="Preparando stock por depósito, movimientos y acciones operativas del módulo."
    />
  )
}
