create type public.app_role as enum ('admin', 'moderator', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

create policy "Users can view own roles"
  on public.user_roles for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

create table public.plants (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  tagline text not null default '',
  price numeric(10,2) not null check (price >= 0),
  tag text not null default '',
  category text not null check (category in ('Foliage', 'Flowering', 'Terrace')),
  stock integer not null default 0 check (stock >= 0),
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

GRANT SELECT ON public.plants TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.plants TO authenticated;
GRANT ALL ON public.plants TO service_role;

ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can browse active plants"
  ON public.plants FOR SELECT
  TO anon, authenticated
  USING (active);

CREATE POLICY "Admins can insert plants"
  ON public.plants FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update plants"
  ON public.plants FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete plants"
  ON public.plants FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

insert into public.plants (name, tagline, price, tag, category, stock) values
  ('Monstera Deliciosa', 'The split-leaf classic', 68, 'Low light', 'Foliage', 12),
  ('Fiddle Leaf Fig', 'Sculptural, statement', 120, 'Bright light', 'Foliage', 6),
  ('String of Pearls', 'Cascading succulent', 42, 'Trailing', 'Terrace', 20),
  ('Rubber Tree', 'Broad, glossy leaves', 95, 'Pet safe', 'Foliage', 8);