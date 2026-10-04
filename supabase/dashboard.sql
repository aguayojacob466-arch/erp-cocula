-- Datos compartidos del Dashboard de Ventas 2026.
-- Ejecutar en Supabase > SQL Editor DESPUES de schema.sql y auth.sql. Es idempotente.
--
-- Lo que el administrador importa desde Excel se guarda aqui (una fila por registro) y
-- todos los usuarios con sesion lo ven en tiempo real.
--   Ver:                      cualquier usuario autenticado
--   Importar / editar / borrar: solo admin  (usa es_admin() de auth.sql)

create table if not exists dashboard_registros (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('ventas', 'inventario', 'facturacion')),
  clave text not null,                 -- identifica el registro; evita duplicados al reimportar
  datos jsonb not null,
  created_at timestamptz not null default now(),
  unique (tipo, clave)
);

alter table dashboard_registros enable row level security;

drop policy if exists dash_ver on dashboard_registros;
create policy dash_ver on dashboard_registros for select to authenticated using (true);

drop policy if exists dash_crear on dashboard_registros;
create policy dash_crear on dashboard_registros for insert to authenticated with check (es_admin());

drop policy if exists dash_editar on dashboard_registros;
create policy dash_editar on dashboard_registros for update to authenticated
  using (es_admin()) with check (es_admin());

drop policy if exists dash_eliminar on dashboard_registros;
create policy dash_eliminar on dashboard_registros for delete to authenticated using (es_admin());

-- Tiempo real: los cambios de esta tabla se envian a los navegadores conectados.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'dashboard_registros'
  ) then
    alter publication supabase_realtime add table dashboard_registros;
  end if;
end $$;
