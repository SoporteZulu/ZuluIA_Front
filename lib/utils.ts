import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import type { OrdenCompra } from "@/lib/types/configuracion"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isOrdenCompraRecepcionAbierta(orden: OrdenCompra) {
  const estado = (orden.estadoOc ?? "").toUpperCase()
  return estado !== "RECIBIDA" && estado !== "CANCELADA"
}

export function isOrdenCompraRecepcionParcial(orden: OrdenCompra) {
  if (!isOrdenCompraRecepcionAbierta(orden)) {
    return false
  }

  if (orden.recepcionParcial) {
    return true
  }

  return Number(orden.cantidadRecibida ?? 0) > 0 && Number(orden.saldoPendiente ?? 0) > 0
}

export function getOrdenCompraRecepcionLabel(orden: OrdenCompra) {
  const estado = (orden.estadoOc ?? "").toUpperCase()

  if (estado === "CANCELADA") {
    return "Recepcion cancelada"
  }

  if (estado === "RECIBIDA") {
    return "Recepcion cerrada"
  }

  if (isOrdenCompraRecepcionParcial(orden)) {
    return "Recepcion parcial"
  }

  if (!orden.habilitada) {
    return "Pendiente bloqueada"
  }

  if (estado === "PENDIENTE") {
    return "Pendiente de recepcion"
  }

  return orden.estadoOperativo || orden.estadoOc || "Sin estado"
}

export function getOrdenCompraRecepcionProgress(orden: OrdenCompra) {
  const cantidadTotal = Number(orden.cantidadTotal ?? 0)
  const cantidadRecibida = Number(orden.cantidadRecibida ?? 0)
  const saldoPendiente = Number(
    orden.saldoPendiente ?? Math.max(cantidadTotal - cantidadRecibida, 0)
  )

  return {
    cantidadTotal,
    cantidadRecibida,
    saldoPendiente,
  }
}
