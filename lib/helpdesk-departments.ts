import type { HDAgente } from "@/lib/types"

export type HDDepartmentOption = {
  id: string
  nombre: string
}

const KNOWN_HD_DEPARTMENT_LABELS: Record<string, string> = {
  "1": "Soporte Tecnico",
  "2": "Atencion al Cliente",
  "3": "Servicios en Campo",
  "dep-001": "Soporte Tecnico",
  "dep-002": "Atencion al Cliente",
  "dep-003": "Servicios en Campo",
}

function formatHdDepartmentLabel(id: string) {
  const normalized = id.trim()
  const knownLabel = KNOWN_HD_DEPARTMENT_LABELS[normalized.toLowerCase()]

  if (knownLabel) {
    return knownLabel
  }

  const numericMatch = normalized.match(/^dep[-_ ]?(\d+)$/i)

  if (numericMatch) {
    return `Departamento ${numericMatch[1]}`
  }

  return normalized
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function getHdDepartmentLabel(id?: string | null) {
  if (!id) return null
  return formatHdDepartmentLabel(id)
}

export function buildHdDepartmentOptions(
  agentes: HDAgente[],
  extraIds: Array<string | null | undefined> = []
): HDDepartmentOption[] {
  const uniqueIds = new Set<string>()

  for (const agente of agentes) {
    if (agente.departamentoId) {
      uniqueIds.add(agente.departamentoId)
    }
  }

  for (const extraId of extraIds) {
    if (extraId) {
      uniqueIds.add(extraId)
    }
  }

  return Array.from(uniqueIds)
    .sort((left, right) => left.localeCompare(right, "es-AR"))
    .map((id) => ({
      id,
      nombre: formatHdDepartmentLabel(id),
    }))
}
