# Compras y Ventas Modernizadas

## Objetivo

Este documento baja a nivel operativo el estado real de la migracion de compras y ventas.
No describe la intencion del legado en abstracto: deja claro que pantallas ya trabajan con hooks y endpoints reales, que partes quedaron preparadas sin simular backend, y que bloques siguen pendientes de la segunda fase.

## Regla de lectura

- Operativo real: la vista consume datos o ejecuta acciones contra endpoints ya existentes.
- Preparado: la UX y los bloques funcionales quedaron listos, pero dependen de metadata o endpoints aun no expuestos.
- Pendiente legado: piezas del sistema viejo que todavia no tienen soporte completo en la API actual.

## Ventas

### Dashboard ventas

- Ruta: `app/ventas/page.tsx`
- Estado: operativo real
- Base tecnica: `useComprobantes({ esVenta: true })`, `useTerceros()`, `useComprobantesConfig()`
- Cobertura actual:
  - KPIs calculados sobre comprobantes reales no anulados.
  - Deteccion de pedidos y remitos a partir de tipos documentales del backend.
  - Evolucion mensual, top clientes por saldo, antiguedad de deuda y alertas operativas.
- Pendiente legado:
  - Pipeline comercial formal por etapa con conversion documental completa.
  - Cobros y recibos como circuito separado dentro del dashboard.

### Facturas de venta

- Ruta: `app/ventas/facturas/page.tsx`
- Estado: operativo real
- Base tecnica: `useComprobantes`, `useComprobantesConfig`, `usePuntosFacturacion`, `useSucursales`, `useTerceros`, `useItems`
- Cobertura actual:
  - Emision documental sobre comprobantes reales.
  - Consulta, detalle, asignacion de CAE y anulacion segun soporte actual del backend.
  - Filtros, KPIs y lectura de detalle por items.
- Pendiente legado:
  - Facturacion masiva y automatica del sistema anterior.
  - Reglas comerciales o fiscales especiales no expuestas por API.

### Pedidos de venta

- Ruta: `app/ventas/pedidos/page.tsx`
- Estado: operativo real condicionado por metadata
- Base tecnica: `useComprobantes({ esVenta: true })`, `useComprobantesConfig`, `useSucursales`, `useTerceros`, `useItems`
- Cobertura actual:
  - Detecta tipos documentales de pedido desde metadata real.
  - Permite alta y consulta solo cuando esos tipos existen en backend.
  - Conserva contexto comercial en observaciones para no inventar tablas auxiliares.
- Preparado:
  - Vendedor, canal y compromiso de entrega ya forman parte de la UX.
- Pendiente legado:
  - Reserva de stock.
  - Aprobaciones.
  - Transformacion formal a remito o factura con trazabilidad de cumplimiento.

### Remitos de venta

- Ruta: `app/ventas/remitos/page.tsx`
- Estado: operativo real condicionado por metadata
- Base tecnica: `useComprobantes({ esVenta: true })`, `useComprobantesConfig`, `useSucursales`, `useTerceros`, `useItems`
- Cobertura actual:
  - Detecta remitos a partir de tipos de venta que afectan stock.
  - Emision, consulta de detalle y anulacion sobre comprobantes reales.
  - Separacion clara entre cabecera logistica, items y totales.
- Preparado:
  - Observacion logistica y fecha compromiso dentro del flujo de alta.
- Pendiente legado:
  - Transporte, chofer, hoja de ruta, entrega parcial, firma y relacion remito-factura.

### Notas de credito y debito

- Ruta: `app/ventas/notas-credito/page.tsx`
- Estado: operativo real condicionado por metadata
- Base tecnica: `useComprobantes({ esVenta: true })`, `useComprobantesConfig`, `useSucursales`, `useTerceros`, `useItems`
- Cobertura actual:
  - Deteccion de tipos de credito y debito desde metadata del backend.
  - Emision, consulta y anulacion sobre motor documental real.
  - Captura de motivo, alcance y referencia documental en observaciones operativas.
- Preparado:
  - Flujo unico para credito y debito con detalle por items y totales.
- Pendiente legado:
  - Vinculacion formal contra factura origen.
  - Devolucion exacta por renglon.
  - Motivo fiscal especifico y reimpresion documental dedicada.

### Listas de precios

- Ruta: `app/ventas/listas-precios/page.tsx`
- Estado: operativo real con segunda fase reservada
- Base tecnica: `useListasPrecios`, `useItems`, `useItemsConfig`
- Cobertura actual:
  - Alta, edicion y baja de listas.
  - Alta, actualizacion y eliminacion de items dentro de la lista.
  - Moneda, vigencia, lista por defecto y detalle por producto con persistencia real.
- Preparado:
  - Seccion explicita para herencia, promociones y precios especiales del legado.
- Pendiente legado:
  - Reglas promocionales.
  - Herencia entre listas.
  - Precios especiales por cliente, canal o vendedor.

### Puntos de facturacion

- Ruta: `app/ventas/puntos-facturacion/page.tsx`
- Estado: operativo real
- Base tecnica: `usePuntosFacturacion`, `useTiposPuntoFacturacion`, `useSucursales`
- Cobertura actual:
  - Alta, edicion, consulta y baja del maestro por sucursal.
  - Consulta del proximo numero para el punto seleccionado.
  - Uso de tipos reales de punto de facturacion.
- Pendiente legado:
  - Numeradores por comprobante.
  - CAI o CAE por circuito.
  - Integracion con controladores o impresoras fiscales.

### Reportes de ventas

- Ruta: `app/ventas/reportes/page.tsx`
- Estado: operativo real
- Base tecnica: `useComprobantes({ esVenta: true })`, `useTerceros()`, `useItems()`
- Cobertura actual:
  - KPIs por periodo real.
  - Tendencias mensuales, composicion por estado, clientes activos y top clientes por facturacion.
  - Libro IVA basado en comprobantes no anulados del periodo filtrado.
  - Margen por producto calculado a partir de costo y precio actuales.
- Pendiente legado:
  - Promociones y efectividad comercial sobre un endpoint dedicado.
  - Reporteria fiscal o comercial mas especializada si el backend incorpora nuevos cortes.

## Compras

### Dashboard compras

- Ruta: `app/compras/page.tsx`
- Estado: operativo real
- Base tecnica: `useComprobantes({ esCompra: true })`, `useOrdenesCompra()`, `useProveedores()`, `useStockResumen()`
- Cobertura actual:
  - Vista ejecutiva del modulo con accesos solo a pantallas existentes del workspace.
  - KPIs reales de compras del mes, saldo abierto, cumplimiento de ordenes y stock bajo.
  - Evolucion mensual por comprobantes de compra, distribucion documental y ranking operativo de proveedores.
- Pendiente legado:
  - Consolidacion financiera, recepciones parciales y circuito documental completo en un solo tablero.

### Proveedores

- Ruta: `app/compras/proveedores/page.tsx`
- Estado: operativo real
- Base tecnica: maestro de terceros adaptado a compras
- Cobertura actual:
  - Maestro ampliado con datos fiscales, comerciales y operativos alineados con el legado.
- Pendiente legado:
  - Retenciones especificas por jurisdiccion y circuitos fiscales avanzados si no estan aun expuestos en backend.

### Solicitudes de compra

- Ruta: `app/compras/solicitudes/page.tsx`
- Estado: operativo real como panel de necesidad, no como workflow formal
- Base tecnica: `useComprasSolicitudes`, `useStockResumen`, `useProveedores`, `useSucursales`
- Cobertura actual:
  - Consume `/api/compras/solicitudes` para detectar necesidades reales de reabastecimiento desde backend.
  - Recibe severidad, faltante, sugerencia, cobertura objetivo y costo estimado ya calculados por API.
  - Mantiene la lectura operativa por sucursal y deposito sin simular workflow manual inexistente.
- Preparado:
  - La vista reemplaza una maqueta falsa por un backlog operativo honesto y enlaza al circuito real siguiente.
- Pendiente legado:
  - Alta formal de solicitud.
  - Aprobacion.
  - Rechazo.
  - Conversion directa a orden de compra.

### Requisiciones de compra

- Ruta: `app/compras/requisiciones/page.tsx`
- Estado: operativo real
- Base tecnica: `useRequisicionesCompra`, `useSucursales`, `useEmpleados`, `useItems`
- Cobertura actual:
  - Consulta paginada de requisiciones reales con detalle e indicadores operativos.
  - Alta real de requisiciones desde frontend con cabecera e items.
  - Acciones reales de enviar, aprobar, rechazar y cancelar.
  - Seguimiento local separado para priorizacion interna sin duplicar estado del backend.
- Pendiente legado:
  - Formularios mas guiados por area, centro de costo o presupuesto si ese metadata reaparece por API.
  - Conversion mas directa hacia cotizacion con precarga automatica de renglones.

### Cotizaciones de compra

- Ruta: `app/compras/cotizaciones/page.tsx`
- Estado: operativo real
- Base tecnica: `useCotizacionesCompra`, `useRequisicionesCompra`, `useProveedores`, `useItems`, `useSucursales`
- Cobertura actual:
  - Consulta real de cotizaciones con detalle, vencimiento y estado comercial.
  - Alta real de cotizaciones desde frontend con proveedor, requisicion opcional e items.
  - Precarga de sucursal, observacion y renglones desde requisiciones aprobadas usando el detalle real del backend.
  - Acciones reales de aprobar y rechazar.
  - Seguimiento local para priorizacion comercial y pase a orden.
- Pendiente legado:
  - Comparativas comerciales avanzadas entre multiples proveedores si el backend expone esa estructura.

### Ordenes de compra

- Ruta: `app/compras/ordenes/page.tsx`
- Estado: operativo real
- Base tecnica: `useOrdenesCompra`, `useComprobantes({ esCompra: true })`, `useProveedores`
- Cobertura actual:
  - Alta basica real de ordenes mediante `CreateOrdenCompraDto`, vinculando un `comprobanteId` de compra existente.
  - Pase operativo desde cotizaciones aprobadas, con proveedor y contexto comercial precargados para iniciar la orden dentro del contrato actual.
  - Consulta de ordenes.
  - Detalle de cabecera.
  - Acciones reales de recibir y cancelar.
  - Trazabilidad visible hacia el comprobante relacionado con estado, fecha y saldo.
  - Resumen operativo de alta y detalle ampliado derivados de la orden real y del comprobante base, sin overlay legado adicional.
- Preparado:
  - Bloque de recepcion y seguimiento operativo ya desacoplado del resto del circuito.
  - Formulario alineado al contrato actual del backend sin simular renglones inexistentes.
- Pendiente legado:
  - Alta completa de la orden con detalle por item.
  - Renglones detallados.
  - Autorizacion.
  - Condiciones comerciales avanzadas.
  - Recepcion parcial por item.

### Recepciones

- Ruta: `app/compras/recepciones/page.tsx`
- Estado: operativo real sobre ordenes
- Base tecnica: `useOrdenesCompra`, `useComprobantes({ esCompra: true })`, `useProveedores`
- Cobertura actual:
  - Opera como bandeja de recepcion sobre ordenes pendientes.
  - Confirma recepcion y cancelacion contra endpoints reales.
  - KPIs de pendientes, recibidas, canceladas y vencidas.
  - Detalle logistico con documento de compra vinculado cuando el comprobante existe en la consulta actual.
  - Continuidad desde ordenes con foco directo sobre una orden puntual en recepciones, resaltando proveedor y acciones sin busqueda manual.
  - Cola operativa priorizada sobre ordenes pendientes, con lectura de saldo asociado y accion rapida de recepcion.
- Pendiente legado:
  - Remito de compra separado.
  - Recepcion parcial por item.
  - Control de diferencias, rechazos y deposito por renglon.

### Facturas de compra

- Ruta: `app/compras/facturas/page.tsx`
- Estado: operativo real
- Base tecnica: `useComprobantes`, `useComprobantesConfig`, `useOrdenesCompra`, `useSucursales`, `useItems`, `useProveedores`
- Cobertura actual:
  - Alta de comprobantes de compra sobre motor documental real.
  - Consulta, detalle y anulacion.
  - Items, totales y filtros por estado, proveedor y tipo.
  - Trazabilidad hacia ordenes de compra vinculadas mediante `comprobanteId`.
  - Resumen operativo y detalle ampliado derivados de datos reales del backend, sin overlay legado decorativo.
  - Apertura con foco por comprobante desde recepciones y salto directo a imputaciones sobre el mismo documento.
- Pendiente legado:
  - Imputaciones contables avanzadas.
  - Reimpresion y anulacion con flujo fiscal ampliado.
  - Vinculo formal con recepciones y ordenes a nivel renglon si el backend no lo expone aun.

### Imputaciones de compra

- Ruta: `app/compras/imputaciones/page.tsx`
- Estado: hibrido con base real
- Base tecnica: `useComprobantes({ esCompra: true })`, `useOrdenesCompra`, `useProveedores`, `useLegacyLocalCollection`
- Cobertura actual:
  - Toma comprobantes reales de compra como base documental de la imputacion.
  - Vincula ordenes visibles y recepcion conocida cuando existen en backend.
  - Mantiene localmente cuenta, centro de costo, distribucion y seguimiento de cierre.
  - Evita el lote fijo legacy y deja explicito que la persistencia contable sigue sin endpoint propio.
  - Acepta foco directo por comprobante desde recepciones o facturas para continuar la conciliacion sin busqueda manual.
- Pendiente legado:
  - Persistencia backend de imputaciones y prorrateos.
  - Distribucion por multiples cuentas y centros de costo con validacion formal.
  - Integracion contable completa con asientos, gastos de importacion y cierre automatico.

### Cedulones

- Ruta: `app/compras/cedulones/page.tsx`
- Estado: operativo real especifico
- Base tecnica: `useCedulones`, `useCajas`, `useSucursales`, `useTerceros`
- Cobertura actual:
  - Alta real de cedulones con proveedor, sucursal, importe y vencimiento.
  - Consulta paginada con filtros, monitor de vencidos y detalle operativo.
  - Registracion de pago contra cajas reales de la sucursal cuando el documento mantiene saldo.
- Pendiente legado:
  - Emision masiva.
  - Impresion dedicada.
  - Agrupaciones o circuitos institucionales especiales si el backend los reexpone.

## Resumen ejecutivo

- Ya operan con backend real: dashboard ventas, facturas de venta, remitos, notas de credito y debito, listas de precios, puntos de facturacion, reportes de ventas, proveedores, solicitudes por stock bajo minimo, requisiciones, cotizaciones, ordenes de compra, recepciones y facturas de compra.
- Operan en modo hibrido con base real y capa local: imputaciones de compra, porque el documento base ya viene del backend pero la conciliacion contable todavia no tiene endpoint dedicado.
- Operan condicionados por metadata real: pedidos de venta, remitos y notas, porque dependen de tipos documentales detectables desde el backend.
- Se evitó maquillar flujos sin API: solicitudes de compra ahora muestran necesidad real de abastecimiento en vez de formularios decorativos.
- La siguiente fase fuerte del legado se concentra en relaciones documento a documento, detalle por renglon, aprobaciones, fiscalidad avanzada y automatizaciones masivas.

## Validacion recomendada

- Verificar con `npm.cmd run lint`
- Verificar con `npm.cmd run build`
- En esta shell integrada no debe asumirse disponibilidad de `pnpm` aunque existan tareas configuradas.
