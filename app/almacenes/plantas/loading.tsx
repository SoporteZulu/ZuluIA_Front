import { WmsPageLoading } from "@/components/almacenes/wms-loading"

export default function Loading() {
  return (
    <WmsPageLoading
      badge="Plantas WMS"
      title="Cargando plantas"
      description="Preparando depósitos, defaults operativos y acciones del maestro estructural."
    />
  )
}
