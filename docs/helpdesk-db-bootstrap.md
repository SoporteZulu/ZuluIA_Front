# Help Desk DB Bootstrap

Si, Help Desk puede y deberia tener migraciones aunque no tenga par en el sistema viejo. En este backend ya existe un modelo EF Core completo para Help Desk; el problema real era que la base local no tenia el esquema alineado con ese modelo y el proyecto todavia no tiene una linea de migraciones operativa.

Estado verificado en esta sesion:

- El esquema Help Desk fue generado desde `AppDbContext.Database.GenerateCreateScript()`.
- El bootstrap se aplico sobre la DB local `zuluia_back_local`.
- Hubo que reparar una tabla preexistente, `hd_ticket_eventos`, porque estaba desactualizada respecto del modelo actual.
- Despues de eso, `dashboard`, `dashboard/segmentado`, `reportes` y `tickets` respondieron OK.
- El backend ya tiene habilitado `Microsoft.EntityFrameworkCore.Design` en API e Infrastructure.
- El repo backend ya tiene manifest local `.config/dotnet-tools.json` para restaurar `dotnet-ef` con `dotnet tool restore`.
- Se genero la baseline EF Core `20260504061145_CurrentSchemaBaseline` en `src/ZuluIA_Back.Infrastructure/Persistence/Migrations/`.
- Se genero el script idempotente `src/ZuluIA_Back.Infrastructure/Persistence/Migrations/CurrentSchemaBaseline.idempotent.sql`.
- Existe un endpoint de desarrollo `POST /api/helpdesk/seed` que carga datos demo de forma idempotente.
- Quedo validado el flujo principal de tickets contra API real: alta, comentario, actualizacion y eliminacion de un ticket temporal.
- Quedaron validados por UI real los CRUD temporales de agentes, servicios y contratos; al finalizar, los conteos volvieron a 3 agentes, 2 servicios y 2 contratos.

## Estado actual recomendado

Con el estado de hoy, la forma mas segura de levantar Help Desk en local es esta:

1. Aplicar el SQL de bootstrap si la base todavia no tiene las tablas Help Desk.
2. Si la base tiene una version vieja de `hd_ticket_eventos`, aplicar la reparacion puntual de este documento.
3. En el repo backend, correr `dotnet tool restore` para recuperar `dotnet-ef`.
4. Validar tooling con `dotnet ef migrations list --project src/ZuluIA_Back.Infrastructure/ZuluIA_Back.Infrastructure.csproj --startup-project src/ZuluIA_Back.Api/ZuluIA_Back.Api.csproj`.
5. Con la API levantada en entorno Development, ejecutar `POST /api/helpdesk/seed` para cargar datos demo reutilizables.
6. Recién despues validar vistas y formularios del frontend.

Notas del estado actual:

- `dotnet ef migrations list` ya funciona y reconoce `20260504061145_CurrentSchemaBaseline (Pending)`.
- El backend ya tiene carpeta de migraciones y `AppDbContextModelSnapshot.cs`.
- Para una base ya alineada con el bootstrap de este documento, el camino seguro sigue siendo `comparar baseline generada + sellar __EFMigrationsHistory + continuar con migraciones incrementales`.

## Baseline de migraciones

Estado confirmado hoy:

- La baseline creada hoy es `20260504061145_CurrentSchemaBaseline`.
- Los archivos generados quedaron en `src/ZuluIA_Back.Infrastructure/Persistence/Migrations/`.
- El snapshot actual del contexto es `AppDbContextModelSnapshot.cs`.
- El script idempotente generado quedo en `src/ZuluIA_Back.Infrastructure/Persistence/Migrations/CurrentSchemaBaseline.idempotent.sql`.

La salida segura no es ejecutar una `InitialCreate` directo sobre una base ya bootstrappeada, porque esa migracion intentaria recrear tablas que hoy ya existen. El camino recomendado es este:

1. Generar la baseline en una rama tecnica del backend, sin aplicarla todavia sobre la base local ya reparada.
2. Revisar el SQL generado contra el bootstrap que ya se aplico en esta documentacion.
3. Para bases nuevas, usar la baseline normal con `dotnet ef database update`.
4. Para bases que ya quedaron alineadas por bootstrap SQL, registrar la baseline en `__EFMigrationsHistory` solo despues de verificar que el esquema coincide.
5. A partir de ahi, cualquier cambio real de modelo Help Desk ya debe salir como migracion incremental comun.

Comandos recomendados en el repo backend:

```powershell
dotnet tool restore

dotnet ef migrations add CurrentSchemaBaseline \
    --project src/ZuluIA_Back.Infrastructure/ZuluIA_Back.Infrastructure.csproj \
    --startup-project src/ZuluIA_Back.Api/ZuluIA_Back.Api.csproj \
    --output-dir Persistence/Migrations

dotnet ef migrations script \
    --project src/ZuluIA_Back.Infrastructure/ZuluIA_Back.Infrastructure.csproj \
    --startup-project src/ZuluIA_Back.Api/ZuluIA_Back.Api.csproj \
    --idempotent \
    --output src/ZuluIA_Back.Infrastructure/Persistence/Migrations/CurrentSchemaBaseline.idempotent.sql
```

Si la base ya fue alineada con el bootstrap de este documento, no apliques esa baseline completa sobre la DB existente. En ese caso, el paso seguro es dejar creada la migracion en codigo, confirmar que el esquema real coincide y luego registrar manualmente la baseline en la historia de EF Core.

SQL orientativo para marcar la baseline sobre una DB ya alineada:

```sql
CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
        "MigrationId" character varying(150) NOT NULL,
        "ProductVersion" character varying(32) NOT NULL,
        CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260504061145_CurrentSchemaBaseline', '8.0.0');
```

Importante:

- Este `INSERT` solo es valido si la estructura real ya coincide con la baseline generada.
- Si hay diferencias entre el SQL generado por EF y el bootstrap aplicado, primero corrige esa deriva. No selles una baseline inconsistente.
- Despues de sellar la baseline, los siguientes cambios ya pueden viajar como migraciones normales con `dotnet ef migrations add <Nombre>` y `dotnet ef database update`.
- Durante `dotnet ef` es esperable ver `HostAbortedException` en consola por la forma en que el startup del API resuelve el host en tiempo de diseño; si la migracion o el script terminan con `Done` o quedan listados por `dotnet ef migrations list`, el artefacto fue generado correctamente.

## SQL de bootstrap

Este bloque sirve para una base que no tenga todavia las tablas Help Desk.

```sql
CREATE TABLE hd_ticket_eventos (
    id bigint GENERATED BY DEFAULT AS IDENTITY,
    ticket_id bigint NOT NULL,
    tipo_evento character varying(50) NOT NULL,
    fecha_hora timestamp with time zone NOT NULL,
    usuario_id bigint,
    detalle text,
    motivo_codigo character varying(50),
    prioridad_anterior character varying(20),
    prioridad_nueva character varying(20),
    asignado_a_anterior_id bigint,
    asignado_a_nuevo_id bigint,
    sla_severidad character varying(20),
    prioridad_automatica character varying(20),
    prioridad_escalada character varying(20),
    escalado boolean NOT NULL,
    reasignacion_sugerida boolean NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    created_by bigint,
    updated_by bigint,
    CONSTRAINT pk_hd_ticket_eventos PRIMARY KEY (id)
);

CREATE TABLE "HDAGENTES" (
    id bigint GENERATED BY DEFAULT AS IDENTITY,
    usuario_id bigint,
    nombre character varying(120) NOT NULL,
    apellido character varying(120) NOT NULL,
    email character varying(200) NOT NULL,
    telefono character varying(60),
    departamento_id bigint,
    rol character varying(30) NOT NULL,
    estado character varying(30) NOT NULL,
    avatar character varying(500),
    habilidades_json jsonb NOT NULL DEFAULT ('[]'::jsonb),
    tickets_asignados integer NOT NULL DEFAULT 0,
    tickets_resueltos integer NOT NULL DEFAULT 0,
    tiempo_promedio_resolucion integer NOT NULL DEFAULT 0,
    calificacion_promedio numeric(5,2) NOT NULL DEFAULT 0.0,
    activo boolean NOT NULL DEFAULT TRUE,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    created_by bigint,
    updated_by bigint,
    CONSTRAINT pk_hdagentes PRIMARY KEY (id)
);

CREATE TABLE "HDCATEGORIASSERVICIO" (
    id bigint GENERATED BY DEFAULT AS IDENTITY,
    nombre character varying(120) NOT NULL,
    descripcion character varying(500),
    icono character varying(60),
    activo boolean NOT NULL DEFAULT TRUE,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    created_by bigint,
    updated_by bigint,
    CONSTRAINT pk_hdcategoriasservicio PRIMARY KEY (id)
);

CREATE TABLE "HDCLIENTES" (
    id bigint GENERATED BY DEFAULT AS IDENTITY,
    tercero_id bigint,
    codigo character varying(30) NOT NULL,
    nombre character varying(200) NOT NULL,
    tipo_cliente character varying(30) NOT NULL,
    email character varying(200),
    telefono character varying(60),
    direccion character varying(300),
    sla_id bigint,
    contrato_activo boolean NOT NULL,
    fecha_inicio_contrato date,
    fecha_fin_contrato date,
    limite_tickets_mes integer,
    tickets_usados_mes integer NOT NULL DEFAULT 0,
    notas text,
    activo boolean NOT NULL DEFAULT TRUE,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    created_by bigint,
    updated_by bigint,
    CONSTRAINT pk_hdclientes PRIMARY KEY (id)
);

CREATE TABLE "HDCLIENTESCONTACTOS" (
    id bigint GENERATED BY DEFAULT AS IDENTITY,
    cliente_id bigint NOT NULL,
    nombre character varying(120) NOT NULL,
    apellido character varying(120) NOT NULL,
    email character varying(200),
    telefono character varying(60),
    cargo character varying(120),
    es_principal boolean NOT NULL,
    activo boolean NOT NULL DEFAULT TRUE,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    created_by bigint,
    updated_by bigint,
    CONSTRAINT pk_hdclientescontactos PRIMARY KEY (id)
);

CREATE TABLE "HDCONTRATOS" (
    id bigint GENERATED BY DEFAULT AS IDENTITY,
    numero character varying(30) NOT NULL,
    cliente_id bigint NOT NULL,
    nombre character varying(200) NOT NULL,
    tipo character varying(30) NOT NULL,
    estado character varying(30) NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date NOT NULL,
    valor_mensual numeric(18,2),
    valor_total numeric(18,2),
    servicios_incluidos_json jsonb NOT NULL DEFAULT ('[]'::jsonb),
    horas_incluidas integer NOT NULL DEFAULT 0,
    horas_consumidas integer NOT NULL DEFAULT 0,
    sla_id bigint,
    renovacion_automatica boolean NOT NULL,
    condiciones text,
    activo boolean NOT NULL DEFAULT TRUE,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    created_by bigint,
    updated_by bigint,
    CONSTRAINT pk_hdcontratos PRIMARY KEY (id)
);

CREATE TABLE "HDDEPARTAMENTOS" (
    id bigint GENERATED BY DEFAULT AS IDENTITY,
    nombre character varying(120) NOT NULL,
    descripcion character varying(500),
    responsable_id bigint,
    email character varying(200),
    tickets_pendientes integer NOT NULL DEFAULT 0,
    activo boolean NOT NULL DEFAULT TRUE,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    created_by bigint,
    updated_by bigint,
    CONSTRAINT pk_hddepartamentos PRIMARY KEY (id)
);

CREATE TABLE "HDFACTURASSERVICIO" (
    id bigint GENERATED BY DEFAULT AS IDENTITY,
    numero character varying(30) NOT NULL,
    cliente_id bigint NOT NULL,
    ordenes_servicio_ids_json jsonb NOT NULL DEFAULT ('[]'::jsonb),
    fecha date NOT NULL,
    fecha_vencimiento date NOT NULL,
    estado character varying(20) NOT NULL,
    subtotal numeric(18,2) NOT NULL,
    descuento numeric(18,2) NOT NULL,
    impuestos numeric(18,2) NOT NULL,
    total numeric(18,2) NOT NULL,
    moneda character varying(10) NOT NULL,
    metodo_pago character varying(60),
    referencia_pago character varying(120),
    notas text,
    activo boolean NOT NULL DEFAULT TRUE,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    created_by bigint,
    updated_by bigint,
    CONSTRAINT pk_hdfacturasservicio PRIMARY KEY (id)
);

CREATE TABLE "HDFACTURASSERVICIOITEMS" (
    id bigint GENERATED BY DEFAULT AS IDENTITY,
    factura_id bigint NOT NULL,
    descripcion character varying(300) NOT NULL,
    servicio_id bigint,
    orden_servicio_id bigint,
    cantidad numeric(18,2) NOT NULL,
    precio_unitario numeric(18,2) NOT NULL,
    descuento numeric(18,2) NOT NULL,
    impuesto numeric(18,2) NOT NULL,
    total numeric(18,2) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    created_by bigint,
    updated_by bigint,
    CONSTRAINT pk_hdfacturasservicioitems PRIMARY KEY (id)
);

CREATE TABLE "HDORDENESSERVICIO" (
    id bigint GENERATED BY DEFAULT AS IDENTITY,
    numero character varying(30) NOT NULL,
    ticket_id bigint,
    cliente_id bigint NOT NULL,
    contacto_id bigint,
    servicio_id bigint NOT NULL,
    tecnico_asignado_id bigint,
    estado character varying(30) NOT NULL,
    prioridad character varying(20) NOT NULL,
    fecha_programada timestamp with time zone,
    fecha_inicio timestamp with time zone,
    fecha_fin timestamp with time zone,
    duracion_real integer,
    direccion_servicio character varying(300),
    descripcion_trabajo text,
    observaciones text,
    recursos_utilizados_json jsonb NOT NULL DEFAULT ('[]'::jsonb),
    firma_cliente text,
    calificacion integer,
    comentario_cliente text,
    activo boolean NOT NULL DEFAULT TRUE,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    created_by bigint,
    updated_by bigint,
    CONSTRAINT pk_hdordenesservicio PRIMARY KEY (id)
);

CREATE TABLE "HDSERVICIOS" (
    id bigint GENERATED BY DEFAULT AS IDENTITY,
    codigo character varying(30) NOT NULL,
    nombre character varying(160) NOT NULL,
    descripcion character varying(1000),
    categoria_id bigint NOT NULL,
    duracion_estimada integer NOT NULL,
    precio_base numeric(18,2) NOT NULL,
    tipo_precio character varying(30) NOT NULL,
    requiere_recursos_json jsonb NOT NULL DEFAULT ('[]'::jsonb),
    garantia_dias integer,
    condiciones text,
    estado character varying(30) NOT NULL,
    activo boolean NOT NULL DEFAULT TRUE,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    created_by bigint,
    updated_by bigint,
    CONSTRAINT pk_hdservicios PRIMARY KEY (id)
);

CREATE TABLE "HDSLAS" (
    id bigint GENERATED BY DEFAULT AS IDENTITY,
    nombre character varying(160) NOT NULL,
    descripcion character varying(1000),
    tipo_cliente character varying(30),
    tiempo_respuesta integer NOT NULL,
    tiempo_resolucion integer NOT NULL,
    horario_inicio character varying(5) NOT NULL,
    horario_fin character varying(5) NOT NULL,
    aplica_fines_semana boolean NOT NULL,
    prioridad_critica_multiplier numeric(8,2) NOT NULL,
    prioridad_alta_multiplier numeric(8,2) NOT NULL,
    prioridad_media_multiplier numeric(8,2) NOT NULL,
    prioridad_baja_multiplier numeric(8,2) NOT NULL,
    estado character varying(30) NOT NULL,
    activo boolean NOT NULL DEFAULT TRUE,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    created_by bigint,
    updated_by bigint,
    CONSTRAINT pk_hdslas PRIMARY KEY (id)
);

CREATE TABLE "HDTICKETS" (
    id bigint GENERATED BY DEFAULT AS IDENTITY,
    numero character varying(30) NOT NULL,
    asunto character varying(200) NOT NULL,
    descripcion text NOT NULL,
    cliente_id bigint NOT NULL,
    contacto_id bigint,
    categoria character varying(40) NOT NULL,
    prioridad character varying(20) NOT NULL,
    estado character varying(30) NOT NULL,
    canal character varying(30) NOT NULL,
    asignado_a_id bigint,
    departamento_id bigint,
    sla_id bigint,
    fecha_creacion timestamp with time zone NOT NULL,
    fecha_primera_respuesta timestamp with time zone,
    fecha_resolucion timestamp with time zone,
    fecha_cierre timestamp with time zone,
    tiempo_respuesta integer,
    tiempo_resolucion integer,
    cumple_sla boolean NOT NULL,
    tickets_relacionados_json jsonb NOT NULL DEFAULT ('[]'::jsonb),
    adjuntos_json jsonb NOT NULL DEFAULT ('[]'::jsonb),
    tags_json jsonb NOT NULL DEFAULT ('[]'::jsonb),
    activo boolean NOT NULL DEFAULT TRUE,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    created_by bigint,
    updated_by bigint,
    CONSTRAINT pk_hdtickets PRIMARY KEY (id)
);

CREATE TABLE "HDTICKETSCOMENTARIOS" (
    id bigint GENERATED BY DEFAULT AS IDENTITY,
    ticket_id bigint NOT NULL,
    usuario_id bigint NOT NULL,
    texto text NOT NULL,
    es_interno boolean NOT NULL,
    fecha_hora timestamp with time zone NOT NULL,
    adjuntos_json jsonb NOT NULL DEFAULT ('[]'::jsonb),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    created_by bigint,
    updated_by bigint,
    CONSTRAINT pk_hdticketscomentarios PRIMARY KEY (id)
);

CREATE INDEX ix_hd_ticket_eventos_fecha_hora ON hd_ticket_eventos (fecha_hora);
CREATE INDEX ix_hd_ticket_eventos_ticket_id ON hd_ticket_eventos (ticket_id);
CREATE INDEX ix_hd_ticket_eventos_tipo_evento ON hd_ticket_eventos (tipo_evento);
CREATE INDEX ix_hdagentes_departamento_estado ON "HDAGENTES" (departamento_id, estado);
CREATE UNIQUE INDEX ux_hdagentes_email ON "HDAGENTES" (email);
CREATE UNIQUE INDEX ux_hdcategoriasservicio_nombre ON "HDCATEGORIASSERVICIO" (nombre);
CREATE INDEX ix_hdclientes_tipocliente_activo ON "HDCLIENTES" (tipo_cliente, activo);
CREATE UNIQUE INDEX ux_hdclientes_codigo ON "HDCLIENTES" (codigo);
CREATE INDEX ix_hdclientescontactos_cliente_activo ON "HDCLIENTESCONTACTOS" (cliente_id, activo);
CREATE INDEX ix_hdcontratos_cliente_estado ON "HDCONTRATOS" (cliente_id, estado);
CREATE UNIQUE INDEX ux_hdcontratos_numero ON "HDCONTRATOS" (numero);
CREATE INDEX ix_hddepartamentos_activo ON "HDDEPARTAMENTOS" (activo);
CREATE UNIQUE INDEX ux_hddepartamentos_nombre ON "HDDEPARTAMENTOS" (nombre);
CREATE INDEX ix_hdfacturasservicio_cliente_estado ON "HDFACTURASSERVICIO" (cliente_id, estado);
CREATE UNIQUE INDEX ux_hdfacturasservicio_numero ON "HDFACTURASSERVICIO" (numero);
CREATE INDEX ix_hdfacturasservicioitems_factura_id ON "HDFACTURASSERVICIOITEMS" (factura_id);
CREATE INDEX ix_hdordenesservicio_cliente_estado ON "HDORDENESSERVICIO" (cliente_id, estado);
CREATE INDEX ix_hdordenesservicio_servicio_estado ON "HDORDENESSERVICIO" (servicio_id, estado);
CREATE UNIQUE INDEX ux_hdordenesservicio_numero ON "HDORDENESSERVICIO" (numero);
CREATE INDEX ix_hdservicios_categoria_estado ON "HDSERVICIOS" (categoria_id, estado);
CREATE UNIQUE INDEX ux_hdservicios_codigo ON "HDSERVICIOS" (codigo);
CREATE INDEX ix_hdslas_tipocliente_estado ON "HDSLAS" (tipo_cliente, estado);
CREATE UNIQUE INDEX ux_hdslas_nombre ON "HDSLAS" (nombre);
CREATE INDEX ix_hdtickets_asignado_estado ON "HDTICKETS" (asignado_a_id, estado);
CREATE INDEX ix_hdtickets_cliente_estado_prioridad ON "HDTICKETS" (cliente_id, estado, prioridad);
CREATE UNIQUE INDEX ux_hdtickets_numero ON "HDTICKETS" (numero);
CREATE INDEX ix_hdticketscomentarios_ticket_fecha ON "HDTICKETSCOMENTARIOS" (ticket_id, fecha_hora);
```

## SQL de reparacion puntual

En esta base local, `hd_ticket_eventos` ya existia pero estaba viejo. Si en otra DB te aparece un error parecido a `no existe la columna h.created_by`, aplica esto:

```sql
ALTER TABLE hd_ticket_eventos ADD COLUMN IF NOT EXISTS motivo_codigo character varying(50);
ALTER TABLE hd_ticket_eventos ADD COLUMN IF NOT EXISTS created_by bigint;
ALTER TABLE hd_ticket_eventos ADD COLUMN IF NOT EXISTS updated_by bigint;
```

## Recomendacion estructural

Para dejar esto bien a futuro, el backend deberia sumar una baseline de migraciones EF Core y dejar de depender de bootstrap manual por SQL.

Hoy ya quedo resuelta la parte de tooling (`Microsoft.EntityFrameworkCore.Design` + `dotnet-ef`). Lo que sigue pendiente no es la herramienta sino definir y generar una migracion baseline segura para todo el backend, evitando introducir una primera migracion ciega sobre una base que ya tiene tablas fuera de Help Desk.
