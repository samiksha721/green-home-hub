-- Roots marketplace: usernames, checkout orders, vendor listings, INR prices.
-- Written to be safe to re-run.

------------------------------------------------------------------------------
-- Profiles (username accounts)
------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique check (username ~ '^[a-z0-9_.]{3,20}$'),
  full_name text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uname text := lower(nullif(trim(new.raw_user_meta_data->>'username'), ''));
begin
  -- Never block a sign-up over a username; the sign-up form checks availability first.
  if uname is not null and (
    uname !~ '^[a-z0-9_.]{3,20}$'
    or exists (select 1 from public.profiles where username = uname)
  ) then
    uname := null;
  end if;
  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    uname,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select lower(trim(p_username)) ~ '^[a-z0-9_.]{3,20}$'
    and not exists (select 1 from public.profiles where username = lower(trim(p_username)));
$$;

revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

------------------------------------------------------------------------------
-- Vendors
------------------------------------------------------------------------------
create table if not exists public.vendors (
  user_id uuid primary key references auth.users(id) on delete cascade,
  business_name text not null check (length(trim(business_name)) between 2 and 80),
  contact_name text not null,
  phone text not null,
  email text not null,
  locality text not null,
  address text not null default '',
  gstin text,
  about text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_note text not null default '',
  created_at timestamptz not null default now()
);

alter table public.vendors enable row level security;
grant select, insert, update on public.vendors to authenticated;
grant all on public.vendors to service_role;

drop policy if exists "Vendors read own profile" on public.vendors;
create policy "Vendors read own profile"
  on public.vendors for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

drop policy if exists "Vendors register themselves" on public.vendors;
create policy "Vendors register themselves"
  on public.vendors for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Vendors update own profile" on public.vendors;
create policy "Vendors update own profile"
  on public.vendors for update to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'))
  with check (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

-- Only admins decide a vendor's status; a rejected vendor who edits their profile goes back to review.
create or replace function public.guard_vendor_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or public.has_role(auth.uid(), 'admin') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.review_note := '';
  else
    new.status := case when old.status = 'rejected' then 'pending' else old.status end;
    new.review_note := old.review_note;
  end if;
  return new;
end;
$$;

drop trigger if exists vendors_guard_status on public.vendors;
create trigger vendors_guard_status
  before insert or update on public.vendors
  for each row execute function public.guard_vendor_status();

create or replace function public.vendor_is_approved(p_vendor uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.vendors where user_id = p_vendor and status = 'approved');
$$;

grant execute on function public.vendor_is_approved(uuid) to anon, authenticated;

------------------------------------------------------------------------------
-- Plants: vendor listings with review
------------------------------------------------------------------------------
alter table public.plants add column if not exists vendor_id uuid references public.vendors(user_id) on delete cascade;
alter table public.plants add column if not exists vendor_name text;
alter table public.plants add column if not exists description text not null default '';
alter table public.plants add column if not exists status text not null default 'approved';
alter table public.plants add column if not exists review_note text not null default '';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'plants_status_check') then
    alter table public.plants add constraint plants_status_check
      check (status in ('pending', 'approved', 'rejected'));
  end if;
  -- Different vendors may sell a plant with the same name; the shop's own items stay unique by name.
  if exists (select 1 from pg_constraint where conname = 'plants_name_key') then
    alter table public.plants drop constraint plants_name_key;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'plants_name_vendor_key') then
    alter table public.plants add constraint plants_name_vendor_key unique nulls not distinct (name, vendor_id);
  end if;
end $$;

drop policy if exists "Public can browse active plants" on public.plants;
drop policy if exists "Public can browse approved plants" on public.plants;
create policy "Public can browse approved plants"
  on public.plants for select to anon, authenticated
  using (active and status = 'approved' and (vendor_id is null or public.vendor_is_approved(vendor_id)));

drop policy if exists "Vendors and admins see listings" on public.plants;
create policy "Vendors and admins see listings"
  on public.plants for select to authenticated
  using (vendor_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

drop policy if exists "Vendors add own listings" on public.plants;
create policy "Vendors add own listings"
  on public.plants for insert to authenticated
  with check (
    vendor_id = auth.uid()
    and exists (select 1 from public.vendors where user_id = auth.uid() and status <> 'rejected')
  );

drop policy if exists "Vendors edit own listings" on public.plants;
create policy "Vendors edit own listings"
  on public.plants for update to authenticated
  using (vendor_id = auth.uid())
  with check (vendor_id = auth.uid());

drop policy if exists "Vendors remove own listings" on public.plants;
create policy "Vendors remove own listings"
  on public.plants for delete to authenticated
  using (vendor_id = auth.uid());

-- Vendor edits go back to review; admins and checkout (stock updates) pass through.
create or replace function public.guard_plant_listing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.vendor_id is not null then
    new.vendor_name := (select business_name from public.vendors where user_id = new.vendor_id);
  end if;
  if auth.uid() is null
    or public.has_role(auth.uid(), 'admin')
    or current_setting('roots.trusted_write', true) = 'on' then
    return new;
  end if;
  if new.vendor_id is distinct from auth.uid() then
    raise exception 'You can only manage your own listings';
  end if;
  new.status := 'pending';
  new.review_note := '';
  new.active := true;
  return new;
end;
$$;

drop trigger if exists plants_guard_listing on public.plants;
create trigger plants_guard_listing
  before insert or update on public.plants
  for each row execute function public.guard_plant_listing();

-- Keep "Sold by" in step when a vendor renames their business (without sending listings back to review).
create or replace function public.sync_vendor_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.business_name is distinct from old.business_name then
    perform set_config('roots.trusted_write', 'on', true);
    update public.plants set vendor_name = new.business_name where vendor_id = new.user_id;
    perform set_config('roots.trusted_write', 'off', true);
  end if;
  return new;
end;
$$;

drop trigger if exists vendors_sync_name on public.vendors;
create trigger vendors_sync_name
  after update on public.vendors
  for each row execute function public.sync_vendor_name();

------------------------------------------------------------------------------
-- Orders
------------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique
    default ('RT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'placed'
    check (status in ('placed', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled')),
  contact_name text not null,
  phone text not null check (phone ~ '^[6-9][0-9]{9}$'),
  address_line text not null,
  locality text not null,
  pincode text not null check (pincode ~ '^560[0-9]{3}$'),
  delivery_notes text not null default '',
  payment_method text not null check (payment_method in ('cod', 'upi_on_delivery')),
  subtotal numeric(10,2) not null default 0,
  delivery_fee numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  plant_id uuid references public.plants(id) on delete set null,
  vendor_id uuid,
  name text not null,
  unit_price numeric(10,2) not null,
  quantity integer not null check (quantity > 0)
);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
grant select, update on public.orders to authenticated;
grant select on public.order_items to authenticated;
grant all on public.orders, public.order_items to service_role;

drop policy if exists "Customers see own orders" on public.orders;
create policy "Customers see own orders"
  on public.orders for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins update orders" on public.orders;
create policy "Admins update orders"
  on public.orders for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Customers see own order items" on public.order_items;
create policy "Customers see own order items"
  on public.order_items for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_id and (o.user_id = auth.uid() or public.has_role(auth.uid(), 'admin'))
  ));

-- Prices and stock come from the database, never from the browser.
create or replace function public.place_order(
  p_items jsonb,
  p_contact_name text,
  p_phone text,
  p_address text,
  p_locality text,
  p_pincode text,
  p_notes text,
  p_payment text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_order_id uuid;
  v_order_number text;
  v_item jsonb;
  v_plant public.plants%rowtype;
  v_qty integer;
  v_subtotal numeric(10,2) := 0;
  v_fee numeric(10,2);
begin
  if v_uid is null then
    raise exception 'Please sign in to place an order';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Your bag is empty';
  end if;
  if length(trim(coalesce(p_contact_name, ''))) < 2 then
    raise exception 'Please enter the name for delivery';
  end if;
  if length(trim(coalesce(p_address, ''))) < 5 then
    raise exception 'Please enter your full delivery address';
  end if;
  if length(trim(coalesce(p_locality, ''))) = 0 then
    raise exception 'Please choose your area';
  end if;
  if coalesce(p_phone, '') !~ '^[6-9][0-9]{9}$' then
    raise exception 'Please enter a 10-digit Indian mobile number';
  end if;
  if coalesce(p_pincode, '') !~ '^560[0-9]{3}$' then
    raise exception 'We deliver within Bangalore only for now (PIN codes starting with 560)';
  end if;
  if coalesce(p_payment, '') not in ('cod', 'upi_on_delivery') then
    raise exception 'Please choose a payment method';
  end if;

  perform set_config('roots.trusted_write', 'on', true);

  insert into public.orders (
    user_id, contact_name, phone, address_line, locality, pincode, delivery_notes, payment_method
  ) values (
    v_uid, trim(p_contact_name), p_phone, trim(p_address), p_locality, p_pincode,
    coalesce(trim(p_notes), ''), p_payment
  )
  returning id, order_number into v_order_id, v_order_number;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 20 then
      raise exception 'Quantities must be between 1 and 20';
    end if;

    select * into v_plant
    from public.plants
    where id = (v_item->>'plant_id')::uuid
      and active and status = 'approved'
      and (vendor_id is null or public.vendor_is_approved(vendor_id))
    for update;
    if not found then
      raise exception 'One of the plants in your bag is no longer available';
    end if;
    if v_plant.stock < v_qty then
      raise exception '% has only % left in stock', v_plant.name, v_plant.stock;
    end if;

    update public.plants set stock = stock - v_qty where id = v_plant.id;
    insert into public.order_items (order_id, plant_id, vendor_id, name, unit_price, quantity)
    values (v_order_id, v_plant.id, v_plant.vendor_id, v_plant.name, v_plant.price, v_qty);
    v_subtotal := v_subtotal + v_plant.price * v_qty;
  end loop;

  v_fee := case when v_subtotal >= 999 then 0 else 99 end;
  update public.orders
    set subtotal = v_subtotal, delivery_fee = v_fee, total = v_subtotal + v_fee
    where id = v_order_id;

  perform set_config('roots.trusted_write', 'off', true);

  return jsonb_build_object(
    'id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'delivery_fee', v_fee,
    'total', v_subtotal + v_fee
  );
end;
$$;

revoke all on function public.place_order(jsonb, text, text, text, text, text, text, text) from public;
grant execute on function public.place_order(jsonb, text, text, text, text, text, text, text) to authenticated;

------------------------------------------------------------------------------
-- Plant photos (vendors upload into a folder named after their user id)
------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('plant-photos', 'plant-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Plant photos are public" on storage.objects;
create policy "Plant photos are public"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'plant-photos');

drop policy if exists "Vendors upload own plant photos" on storage.objects;
create policy "Vendors upload own plant photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'plant-photos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(), 'admin'))
  );

drop policy if exists "Vendors replace own plant photos" on storage.objects;
create policy "Vendors replace own plant photos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'plant-photos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(), 'admin'))
  );

drop policy if exists "Vendors delete own plant photos" on storage.objects;
create policy "Vendors delete own plant photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'plant-photos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(), 'admin'))
  );

------------------------------------------------------------------------------
-- Launch catalogue priced in INR (only rewrites the original dollar prices)
------------------------------------------------------------------------------
update public.plants set price = 1299 where name = 'Monstera Deliciosa' and vendor_id is null and price < 200;
update public.plants set price = 2499 where name = 'Fiddle Leaf Fig' and vendor_id is null and price < 200;
update public.plants set price = 649 where name = 'String of Pearls' and vendor_id is null and price < 200;
update public.plants set price = 899 where name = 'Rubber Tree' and vendor_id is null and price < 200;
