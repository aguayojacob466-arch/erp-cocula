-- Login y roles. Ejecutar en Supabase > SQL Editor DESPUES de schema.sql.
-- Es idempotente.
--
-- Roles:
--   admin   -> todo, incluido eliminar registros y administrar perfiles.
--   usuario -> leer, crear y editar. No puede eliminar.
-- Cualquier usuario nuevo creado en Authentication > Users entra como 'usuario'.
-- Para promover a alguien: update perfiles set rol = 'admin' where email = '...';

create table if not exists perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  rol text not null default 'usuario' check (rol in ('admin', 'usuario')),
  created_at timestamptz not null default now()
);

alter table perfiles enable row level security;

-- security definer: evita recursion de RLS al consultar perfiles desde sus propias politicas.
create or replace function es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfiles where id = auth.uid() and rol = 'admin');
$$;

create or replace function crear_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into perfiles (id, email) values (new.id, new.email) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function crear_perfil();

-- Perfiles para los usuarios que ya existen.
insert into perfiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

-- ADMIN
update perfiles set rol = 'admin' where lower(email) = 'j.aguayo@promaquiladecocula.com';

drop policy if exists perfiles_leer on perfiles;
create policy perfiles_leer on perfiles for select to authenticated
  using (id = auth.uid() or es_admin());

drop policy if exists perfiles_admin on perfiles;
create policy perfiles_admin on perfiles for all to authenticated
  using (es_admin()) with check (es_admin());

-- Tablas del ERP: se quita el acceso anonimo temporal y se exige sesion.
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
    execute format('drop policy if exists ver on %I', t);
    execute format('drop policy if exists crear on %I', t);
    execute format('drop policy if exists editar on %I', t);
    execute format('drop policy if exists eliminar on %I', t);
    execute format('create policy ver on %I for select to authenticated using (true)', t);
    execute format('create policy crear on %I for insert to authenticated with check (true)', t);
    execute format('create policy editar on %I for update to authenticated using (true) with check (true)', t);
    execute format('create policy eliminar on %I for delete to authenticated using (es_admin())', t);
  end loop;
end $$;

-- El movimiento de inventario ya no es publico.
revoke all on function mover_inventario(uuid, text, numeric, text, date, text) from public, anon;
grant execute on function mover_inventario(uuid, text, numeric, text, date, text) to authenticated;
