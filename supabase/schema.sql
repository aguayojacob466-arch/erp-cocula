-- Esquema del ERP Cocula. Ejecutar completo en Supabase > SQL Editor.
-- Es idempotente: se puede correr varias veces sin romper datos existentes.

create extension if not exists pgcrypto;

create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nombre text not null,
  nombre_comercial text,
  rfc text,
  tipo text default 'cadena',
  ciudad text,
  iniciales text,
  color text default '#2E6B4A',
  frecuencia text default 'Semanal',
  dias_credito int default 90,
  factoraje boolean default false,
  descuento_logistica numeric default 0,
  minimo_compra numeric default 0,
  marca_blanca boolean default true,
  nombre_marca text,
  politica_faltantes text default 'reprograma',
  salud text default 'activo'
);

create table if not exists contactos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  nombre text not null,
  puesto text,
  telefono text,
  email text
);

create table if not exists actividades (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  tipo text,
  descripcion text,
  fecha date
);

create table if not exists alertas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  tipo text,
  nota text,
  fecha date,
  resuelta boolean not null default false
);

create table if not exists productos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  sku text not null,
  nombre text not null,
  unidad text default 'Caja',
  piezas_caja int default 12,
  precio_pactado numeric not null default 0
);

create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  folio text not null,
  cliente_id uuid not null references clientes(id) on delete cascade,
  oc_cliente text,
  fecha date,
  fecha_entrega date,
  subtotal numeric not null default 0,
  descuento_logistica numeric not null default 0,
  total numeric not null default 0,
  factoraje boolean default false,
  etapa text not null default 'oc',
  tipo_entrega text
);

create table if not exists pedido_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  producto_id uuid not null references productos(id),
  cantidad numeric not null,
  precio numeric not null,
  cantidad_entregada numeric,
  motivo_faltante text,
  motivo_otro text
);

create table if not exists embarques (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  tipo_embarque text default 'paqueteria',
  carrier text,
  destino text,
  fecha_estimada date,
  estado text not null default 'pendiente'
);

create table if not exists materias_primas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nombre text not null,
  categoria text,
  stock numeric not null default 0,
  minimo numeric not null default 0,
  unidad text default 'kg',
  proveedor text,
  ultima_entrada date
);

create table if not exists movimientos_inventario (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  materia_prima_id uuid not null references materias_primas(id) on delete cascade,
  tipo text not null,
  cantidad numeric not null,
  responsable text,
  fecha date,
  nota text
);

create table if not exists lotes_produccion (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  producto_id uuid not null references productos(id),
  tipo text not null default 'lote',
  cantidad numeric not null,
  fecha_inicio date,
  fecha_fin date,
  pedido_id uuid references pedidos(id) on delete set null,
  avance numeric not null default 0,
  estado text not null default 'programado'
);

create index if not exists idx_contactos_cliente on contactos(cliente_id);
create index if not exists idx_actividades_cliente on actividades(cliente_id);
create index if not exists idx_alertas_cliente on alertas(cliente_id);
create index if not exists idx_productos_cliente on productos(cliente_id);
create index if not exists idx_pedidos_cliente on pedidos(cliente_id);
create index if not exists idx_items_pedido on pedido_items(pedido_id);
create index if not exists idx_embarques_pedido on embarques(pedido_id);
create index if not exists idx_movs_materia on movimientos_inventario(materia_prima_id);
create index if not exists idx_lotes_producto on lotes_produccion(producto_id);

-- Row Level Security.
-- ATENCION: la app todavia no tiene login, asi que estas politicas dejan
-- acceso total a quien tenga la publishable key. Es temporal. Al agregar
-- Supabase Auth, cambia "to anon, authenticated" por "to authenticated".
do $$
declare t text;
begin
  foreach t in array array[
    'clientes','contactos','actividades','alertas','productos','pedidos',
    'pedido_items','embarques','materias_primas','movimientos_inventario',
    'lotes_produccion'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists acceso_app on %I', t);
    execute format(
      'create policy acceso_app on %I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Productos: un SKU no puede repetirse dentro del mismo cliente.
create unique index if not exists uq_productos_cliente_sku on productos(cliente_id, sku);

-- Movimiento de inventario atomico: cambia el stock Y registra el historial
-- en una sola transaccion, sumando sobre el valor actual de la base (no sobre
-- el que ve el navegador), asi dos usuarios no se pisan.
-- p_cantidad es el cambio con signo: positivo entra, negativo sale.
create or replace function mover_inventario(
  p_materia uuid,
  p_tipo text,
  p_cantidad numeric,
  p_responsable text default null,
  p_fecha date default current_date,
  p_nota text default null
) returns materias_primas
language plpgsql
as $$
declare
  fila materias_primas;
begin
  if p_tipo not in ('entrada', 'salida', 'ajuste') then
    raise exception 'Tipo de movimiento invalido: %', p_tipo;
  end if;

  update materias_primas
     set stock = stock + p_cantidad,
         ultima_entrada = case when p_tipo = 'entrada' then p_fecha else ultima_entrada end
   where id = p_materia
   returning * into fila;

  if not found then
    raise exception 'Materia prima no encontrada';
  end if;

  insert into movimientos_inventario (materia_prima_id, tipo, cantidad, responsable, fecha, nota)
  values (p_materia, p_tipo, p_cantidad, p_responsable, p_fecha, p_nota);

  return fila;
end;
$$;

grant execute on function mover_inventario(uuid, text, numeric, text, date, text) to anon, authenticated;
