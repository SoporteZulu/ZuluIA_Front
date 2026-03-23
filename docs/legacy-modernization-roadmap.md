# Modernizacion legado ZuluApp -> ZuluIA Front

## Criterio de migracion

- Mantener la estructura visual y navegacion del frontend actual.
- Conservar del legado las pestañas, campos y bloques operativos que siguen teniendo valor funcional.
- Priorizar primero los modulos con soporte de API/hook ya existente para evitar formularios decorativos sin integracion.
- Donde el backend actual aun no expone todos los datos del legado, dejar la estructura de pantalla preparada con estados vacios y notas operativas claras.

## Modulos y formularios origen

### Ventas

- Clientes
  - Legado: `frmCliente.frm`
  - Tabs detectados: Cliente, Contactos, Transportes, Datos Principales, Datos de Ubicacion, Datos Fiscales, Datos Comerciales, Otros
  - Campos clave: razon social, nombre comercial, apellido, nombre, tipo y nro documento, legajo, nro interno, personeria, domicilio, telefono, mail, clave fiscal, condicion fiscal, CP, sucursal, observacion, cuenta corriente, limite de saldo, limite de credito total, vendedor, cobrador, comisiones, rubro, sector, zona, moneda, facturador por defecto, dias y horarios de cobranza, plazo de cobro, condicion de venta, minimo MiPyme, facturable, nro municipal, nro ingresos brutos
- Pedidos
  - Legado: `frmNotaPedido.frm`
- Remitos
  - Legado: `frmRemitosVentasNoValorizados.frm`, `frmRemitosVentasValorizados.frm`, `frmRemitosMasivos.frm`
- Facturas
  - Legado: `frmFacturaVenta.frm`, `frmFacturacionMasiva.frm`, `frmFacturacionAutomatica.frm`
- Notas de credito/debito
  - Legado: `frmNotaCreditoVenta.frm`, `frmNotaDebitoVenta.frm`, variantes import/export
- Listas de precios
  - Legado: `frmListasPrecios.frm`, `frmListasPreciosOpciones.frm`, `frmListasPreciosNuevoItem.frm`
- Descuentos
  - Legado: `frmDescuentos.frm`, `frmDescuento_AM.frm`
- Cuenta corriente y cobranzas
  - Legado: `frmCobro.frm`, `frmRecibos.frm`, `frmRecibosMasivos.frm`, `frmImpresionCuentaCorriente.frm`
- Puntos de facturacion
  - Legado: `frmRegistrarComprobantePuntoVenta.frm`, `frmRegistrarComprobantePos.frm`

### Compras

- Proveedores
  - Legado: `frmProveedor.frm`
  - Tabs detectados: Proveedor, Contactos, Datos Principales, Datos de Ubicacion, Datos Fiscales, Datos Comerciales, Otros
  - Campos clave: denominacion social, nombre comercial, tipo y nro documento, categoria, sucursal, estado, fecha alta, fecha registro, nro interno, pais, observacion, domicilios, medios de contacto, cuenta corriente, limites, zona, sector, rubro, facturador por defecto, plazo de pago, condicion, moneda, condicion ingresos brutos, facturable, clave fiscal, condicion fiscal, valor clave fiscal, cuenta contable, nro municipal, nro ingresos brutos, nro CAI, vencimiento CAI, CBU
  - Retenciones detectadas: IVA, GAN, IIBB, SUSS, AGIP, SIRCAR, Misiones
- Solicitudes y requisiciones
  - Legado: `frmCompraRequisicionCompra.frm`, `frmCompraRequisicionObra.frm`, `frmCompraProcesarRequisicion.frm`
- Cotizaciones
  - Legado: `frmCotizacionCompra.frm`, `frmCompraCotizacionCompra.frm`, `frmCompraCotizacionesMasivas.frm`, `frmCompraProcesarCotizacion.frm`
- Ordenes de compra
  - Legado: `frmOrdenCompra.frm`, `frmCompraPedidosCompra.frm`
- Recepciones y remitos de compra
  - Legado: `frmRemitosComprasNoValorizados.frm`, `frmRemitosComprasValorizados.frm`, `frmDevolucionCompraStock.frm`
- Facturas y comprobantes de compra
  - Legado: `frmComprobantesCompras.frm`, `frmImputacionesCompras.frm`, `frmReimpresionComprobantesCompras.frm`, `frmAnulacionComprobantesCompras.frm`
- Cedulones
  - Legado vinculado: `frmColegioEmisionCedulones.frm`

### Contabilidad y tesoreria

- Plan de cuentas
  - Legado: `frmPlanCuentas.frm`
- Asientos
  - Legado: `frmAsientosManuales.frm`, `frmGenerarAsientos.frm`, `frmReorganizadorNroAsiento.frm`
- Cajas y cuentas bancarias
  - Legado: `frmCajasCuentasBancarias.frm`, `frmAperturaCajasCuentasBancarias.frm`, `frmTransferenciasCajasCuentasBancarias.frm`
  - Campos clave: tipo, descripcion, saldo actual, sucursales asociadas, banco, cuenta, CBU, entrada, salida, tesoreria, formas de pago
- Cheques
  - Legado: `frmChequesTerceroDeposito.frm`, `frmChequesTerceroVenta.frm`, `frmChequesTerceroRechazo.frm`, `frmExportarAnticiposCheques.frm`, `frmAuditoriaCheques.frm`
  - Campos clave: cuenta bancaria destino, fecha deposito, numero de boleta, importe total, moneda, cotizacion de emision, cartera, acreditacion, rechazo, entrega
- Cotizaciones
  - Legado: `frmCotizaciones.frm`
- Pagos y cobros
  - Legado: `frmPago.frm`, `frmCobro.frm`, `frmPagoRetenciones.frm`, `frmOrdenPago.frm`, `frmOrdenesPagosEfectivo.frm`
- IVA y libro fiscal
  - Legado: `frmGenerarIVACompras.frm`, `frmGenerarIVAVentas.frm`, `frmReimpresionIVACompras.frm`, `frmReimpresionIVAVentas.frm`
- Retenciones
  - Legado: `frmABM_Retencion.frm`, mas bloques fiscales embebidos en proveedor

### Almacenes / WMS

- Depositos / almacenes
  - Legado: `frmDepositos.frm`
- Inventario y movimientos
  - Legado: `frmItems.frm`, `frmAjustesIngresoStock.frm`, `frmAjustesEgresoStock.frm`, `frmTransferenciaDeposito.frm`
- Recepciones
  - Legado: remitos de compra y operaciones de deposito
- Picking / ordenes de preparacion
  - Legado: `frmOrdenPreparacionPicking.frm`, `frmOrdenDePreparacion.frm`, `frm_OrdenDePreparacion.frm`
- Ordenes de trabajo
  - Legado: `frmOrdenTrabajo.frm`, `frmConsumoOrdenTrabajo.frm`
- Formulas de produccion
  - Legado: `frmDeclaracionFormulaProductos.frm`, `frmDeclaracionFormulaHistorial.frm`, `frmAjusteIngresoConFormulas.frm`
- Carta de porte
  - Legado: `frmCartaPorte.frm`, `frmCertificacionPrimariaGranos.frm`, `frmLiquidacionPrimariaGranos.frm`
- Transportistas
  - Legado relacionado: tab Transportes de clientes y circuitos logisticos

### RRHH

- Empleados
  - Legado: `frmEmpleado.frm`
  - Tabs detectados: Datos Principales, Datos de Ubicacion, Datos Fiscales, Datos Comerciales, Otros
  - Campos clave: legajo, denominacion social, apellido, nombre, tipo y nro documento, fecha nacimiento, sexo, nacionalidad, estado civil, profesion, tratamiento, sucursal, categoria, estado, fecha alta, fecha registro, pais, domicilios, medios de contacto, foto, observacion, perfiles, areas, comision de cobranzas, comision de ventas, facturable, clave fiscal, condicion fiscal, valor clave fiscal
- Sueldos
  - Legado: `frmSueldos.frm`

### CRM, Helpdesk, Proyectos y THOR

- No tienen correspondencia 1:1 directa en el legado VB6 revisado.
- Mantener como modulos modernos nativos, conservando solo datos transversales del maestro de terceros cuando corresponda.

## Fases de implementacion

### Fase 1

- Clientes
- Proveedores
- Empleados
- Cajas
- Cheques

### Fase 2

- Ordenes de compra
- Pedidos de venta
- Facturas de compra
- Facturas de venta
- Remitos
- Listas de precios
- Descuentos
- Puntos de facturacion

### Fase 3

- WMS operativo completo
- Retenciones por proveedor
- Cuenta corriente avanzada
- Reportes y circuitos auxiliares

## Estado

- Fase 1 completada: clientes, proveedores, empleados, cajas y cheques
- Fase 2 en desarrollo: ordenes de compra, solicitudes de compra, pedidos de venta, recepciones de compra, descuentos comerciales, puntos de facturacion, listas de precios, remitos de venta, notas de credito/debito, facturas de venta y facturas de compra modernizados
- Fase 3 iniciada: dashboards operativos de ventas y compras, cuenta corriente de ventas y reportes comerciales modernizados sobre comprobantes, saldos, stock y movimientos reales del backend
- Validacion actual: `npm run build` y `npm run lint` exitosos; en este entorno se validan via `npm.cmd` porque `pnpm` no esta disponible en la shell integrada

## Documentacion operativa

- Detalle vigente de compras y ventas modernizadas: `docs/compras-ventas-modernization-status.md`
